/**
 * Generic single-record endpoint: read, update (with per-field immutability),
 * and delete (blocked when other records depend on the row).
 */

import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSessionUser } from "@/lib/auth";
import { getResource } from "@/lib/resources";
import { buildZodSchema } from "@/lib/resource-types";
import { mutate, recordActivity, recordAudit, notify } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource: resourceKey, id } = await ctx.params;
  const resource = getResource(resourceKey);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${resourceKey}".` }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.view)) return NextResponse.json({ error: "Not permitted." }, { status: 403 });

  const { getDb } = await import("@/lib/store");
  const db = await getDb();
  const row = (db[resource.collection] as unknown as Record<string, unknown>[]).find((r) => r.id === id);
  if (!row) return NextResponse.json({ error: `${resource.label} ${id} was not found.` }, { status: 404 });

  if (resource.portalScope === "hospital" && user.role === "Hospital Client" && user.hospitalId && row.hospitalId !== user.hospitalId) {
    return NextResponse.json({ error: "This record belongs to another client account." }, { status: 403 });
  }
  if (resource.portalScope === "employee" && user.role === "Doctor" && user.employeeId && row.employeeId !== user.employeeId) {
    return NextResponse.json({ error: "This record belongs to another employee." }, { status: 403 });
  }
  return NextResponse.json({ row });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource: resourceKey, id } = await ctx.params;
  const resource = getResource(resourceKey);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${resourceKey}".` }, { status: 404 });

  const limit = rateLimit(`patch:${resourceKey}`, 180, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.manage)) {
    return NextResponse.json({ error: `Role "${user.role}" is not permitted to edit ${resource.labelPlural}.` }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const outcome = await mutate((db) => {
    const collection = db[resource.collection] as unknown as Record<string, unknown>[];
    const row = collection.find((r) => r.id === id) as Record<string, unknown> | undefined;
    if (!row) return { error: `${resource.label} ${id} was not found.`, status: 404 } as const;

    const immutable = new Set(resource.immutableFields ?? []);
    if (resource.key === "payroll-runs" && (row.locked as boolean) && db.settings.demoMode === false) {
      return { error: "Finalised payroll is locked. Raise an adjustment instead.", status: 409 } as const;
    }

    const values: Record<string, unknown> = { ...body };
    for (const key of immutable) delete values[key];

    const schema = buildZodSchema(resource.fields, db);
    // Validate only the editable subset: merge with the current row.
    const merged: Record<string, unknown> = { ...row };
    const editable = resource.fields.filter((f) => !f.readOnly);
    const patchShape: Record<string, unknown> = {};
    for (const f of editable) if (f.name in values) patchShape[f.name] = values[f.name];
    const patchSchema = buildZodSchema(
      Object.keys(patchShape).length === editable.length
        ? editable
        : (editable.filter((f) => f.name in patchShape) as typeof editable),
      db
    );
    const parsed = patchSchema.safeParse(patchShape);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: "Validation failed.", fieldErrors, status: 422 } as const;
    }
    Object.assign(merged, parsed.data);
    void schema;

    const refineError = resource.refine?.({ ...merged, id }, db) ?? null;
    if (refineError) return { error: refineError, fieldErrors: { _root: refineError }, status: 422 } as const;

    if (resource.key === "payments") {
      const inv = db.invoices.find((i) => i.id === row.invoiceId);
      if (inv && Number(parsed.data.amount) !== Number(row.amount)) {
        const delta = Number(parsed.data.amount) - Number(row.amount);
        if (Number(parsed.data.amount) > inv.outstanding + Number(row.amount))
          return { error: "Corrected receipt exceeds the outstanding balance plus the original amount." , status: 422 } as const;
        inv.amountPaid = Math.max(0, Math.round((inv.amountPaid + delta) * 100) / 100);
        inv.outstanding = Math.max(0, Math.round((inv.totalAmount - inv.amountPaid) * 100) / 100);
        inv.status = inv.outstanding <= 0 ? "Paid" : inv.amountPaid > 0 ? "Partially Paid" : inv.status;
      }
    }
    if (resource.key === "candidates") merged.updatedAt = new Date().toISOString();
    if (resource.key === "leads") merged.updatedAt = new Date().toISOString();
    if (resource.key === "applications") merged.updatedAt = new Date().toISOString();
    if (resource.key === "salary-structures") {
      const emp = db.employees.find((e) => e.id === row.employeeId);
      if (emp) emp.salaryStructureId = id;
    }

    const before = { ...row };
    Object.assign(row, merged);
    resource.afterUpdate?.(row, before, db, user);

    if (["hospitals", "leads", "contracts", "candidates", "deployments", "invoices", "employees"].includes(resource.key)) {
      recordActivity(db, {
        entity: resource.label,
        entityId: id,
        hospitalId: typeof row.hospitalId === "string" ? row.hospitalId : undefined,
        type: `${resource.label} Updated`,
        summary: `${resource.label} ${id} updated by ${user.name}.`,
        actorId: user.id,
      });
    }
    const changed = Object.keys(parsed.data as Record<string, unknown>).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify((row as Record<string, unknown>)[k])
    );
    recordAudit(
      db,
      user,
      "UPDATE",
      resource.labelPlural,
      id,
      `${user.name} updated ${resource.label.toLowerCase()} ${id} (${changed.join(", ") || "no field changes"}).`,
      Object.fromEntries(changed.map((k) => [k, before[k]])),
      Object.fromEntries(changed.map((k) => [k, (row as Record<string, unknown>)[k]]))
    );
    return { row } as const;
  });

  if ("error" in outcome) {
    return NextResponse.json(
      { error: outcome.error, fieldErrors: (outcome as { fieldErrors?: Record<string, string> }).fieldErrors },
      { status: (outcome as { status?: number }).status ?? 422 }
    );
  }
  void notify;
  return NextResponse.json({ ok: true, row: outcome.row });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource: resourceKey, id } = await ctx.params;
  const resource = getResource(resourceKey);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${resourceKey}".` }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.manage)) {
    return NextResponse.json({ error: `Role "${user.role}" is not permitted to delete ${resource.labelPlural}.` }, { status: 403 });
  }

  const outcome = await mutate((db) => {
    const collection = db[resource.collection] as unknown as Record<string, unknown>[];
    const row = collection.find((r) => r.id === id);
    if (!row) return { error: `${resource.label} ${id} was not found.`, status: 404 } as const;

    const blocked = resource.blockDelete?.(row, db) ?? null;
    if (blocked) return { error: blocked, status: 409 } as const;

    const index = collection.indexOf(row);
    collection.splice(index, 1);

    // Dependent records are archived rather than orphaned.
    if (resource.key === "hospitals") {
      db.deployments.filter((d) => d.hospitalId === id).forEach((d) => { d.status = "Terminated"; d.notes = `${d.notes} Hospital record deleted.`.trim(); });
    }
    if (resource.key === "candidates") {
      // Applications survive the candidate but are marked as declined so the
      // requisition fill counts stay truthful.
      db.applications
        .filter((a) => a.candidateId === id)
        .forEach((a) => {
          if (a.stage !== "Joined" && a.stage !== "Offer Released") {
            a.stage = "Rejected";
            a.rejectedReason = "Candidate record was deleted.";
            a.updatedAt = new Date().toISOString();
          }
        });
    }
    if (resource.key === "contracts") {
      db.deployments.filter((d) => d.contractId === id).forEach((d) => { if (d.status === "Active" || d.status === "Confirmed") d.status = "Terminated"; });
    }

    recordAudit(db, user, "DELETE", resource.labelPlural, id, `${user.name} deleted ${resource.label.toLowerCase()} ${id}.`, row);
    return { ok: true } as const;
  });

  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: (outcome as { status?: number }).status ?? 409 });
  }
  return NextResponse.json({ ok: true });
}
