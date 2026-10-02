/**
 * Generic collection endpoint.
 *
 * GET  —” filtered, sorted, paginated list for any registered resource.
 * POST —” validated create. Validation uses the same Zod schema the UI form is
 *        generated from, so a hand-crafted request cannot bypass the rules.
 *
 * Every mutation runs inside `mutate()`, which re-reads and then persists the
 * single JSON document, so a write always carries its audit entry.
 */

import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSessionUser, scopeRowsToPortal } from "@/lib/auth";
import { getResource } from "@/lib/resources";
import { buildZodSchema } from "@/lib/resource-types";
import { getDb, mutate, newId, notify, recordActivity, recordAudit } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { Database, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PREFIX: Record<string, string> = {
  hospitals: "HSP",
  leads: "LEAD",
  contacts: "HCT",
  opportunities: "OPP",
  followups: "FUP",
  contracts: "CTR",
  candidates: "CAN",
  requisitions: "JOB",
  applications: "APP",
  interviews: "INT",
  offers: "OFR",
  employees: "EMP",
  "salary-structures": "SAL",
  deployments: "DEP",
  shifts: "SFT",
  attendance: "ATT",
  "leave-requests": "LVR",
  "payroll-runs": "PR",
  "payroll-items": "PIT",
  payslips: "PS",
  invoices: "INV",
  payments: "PAY",
  expenses: "EXP",
  "purchase-orders": "PO",
  requirements: "REQ",
  "service-requests": "SR",
  documents: "DOC",
  users: "USR",
};

function matchesFilters(row: Record<string, unknown>, filters: Record<string, string>) {
  for (const [field, value] of Object.entries(filters)) {
    if (!value || value === "all") continue;
    const actual = row[field];
    if (Array.isArray(actual)) {
      if (!actual.includes(value)) return false;
    } else if (String(actual) !== value) return false;
  }
  return true;
}

function visibleRows(db: Database, user: User, resourceKey: string) {
  const resource = getResource(resourceKey)!;
  const collection = db[resource.collection] as unknown as Record<string, unknown>[];
  // Deny by default: portal roles are restricted unless a resource explicitly
  // declares itself company-wide, so a new module cannot leak records.
  return scopeRowsToPortal(user, collection, resource.portalScope, db, resource.portalMatch);
}

export async function GET(request: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource: resourceKey } = await ctx.params;
  const resource = getResource(resourceKey);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${resourceKey}".` }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.view)) {
    return NextResponse.json(
      { error: `Role "${user.role}" is not permitted to view ${resource.labelPlural}.` },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(5, Number(url.searchParams.get("pageSize") ?? "25")));
  const sort = url.searchParams.get("sort") ?? "";
  const dir = url.searchParams.get("dir") === "desc" ? -1 : 1;
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith("f_")) filters[key.slice(2)] = value;
  });

  const db = await getDb();
  let rows = visibleRows(db, user, resourceKey);

  if (q) {
    // Search covers the declared raw fields plus the resolved display values, so
    // a table column backed by a lookup (employee name, hospital name) is
    // searchable even though the stored record only holds an ID.
    const searchHaystack = (row: Record<string, unknown>) => {
      const parts: string[] = [];
      for (const f of resource.searchFields ?? []) parts.push(String(row[f] ?? ""));
      if (!resource.searchFields?.length) {
        for (const col of resource.columns) {
          const raw = col.value ? col.value(row, db) : row[col.key];
          parts.push(String(raw ?? ""));
        }
      }
      return parts.join(" ").toLowerCase();
    };
    rows = rows.filter((row) => searchHaystack(row).includes(q));
  }
  rows = rows.filter((row) => matchesFilters(row, filters));

  if (sort) {
    rows = [...rows].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  } else if (resourceKey === "followups") {
    rows = [...rows].sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
  } else if (resourceKey === "shifts" || resourceKey === "attendance") {
    rows = [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  } else {
    rows = [...rows].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize).map((row) => {
    const cells: Record<string, string | number> = {};
    for (const col of resource.columns) {
      const raw = col.value ? col.value(row, db) : row[col.key];
      cells[col.key] =
        raw === null || raw === undefined || raw === ""
          ? "—"
          : col.type === "money"
            ? Number(raw)
            : col.type === "number" || col.type === "percent"
              ? Number(raw)
              : Array.isArray(raw)
                ? raw.join(", ")
                : String(raw);
    }
    return { ...row, __cells: cells };
  });

  return NextResponse.json({
    rows: pageRows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource: resourceKey } = await ctx.params;
  const resource = getResource(resourceKey);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${resourceKey}".` }, { status: 404 });

  const limit = rateLimit(`mutate:${resourceKey}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.manage)) {
    return NextResponse.json(
      { error: `Role "${user.role}" is not permitted to create or edit ${resource.labelPlural}.` },
      { status: 403 }
    );
  }

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const outcome = await mutate((db) => {
    let uploadDocId: string | undefined;
    if (typeof raw.__receiptName === "string" && raw.__receiptName) {
      uploadDocId = `DOC-${Date.now().toString(36).toUpperCase()}`;
      db.documents.unshift({
        id: uploadDocId,
        name: raw.__receiptName,
        category: resource.key === "documents" ? "Other" : "Expense Receipt",
        ownerType: resource.key === "documents" ? "System" : "Expense",
        ownerId: "pending",
        fileName: raw.__receiptName,
        mimeType: typeof raw.__receiptType === "string" ? raw.__receiptType : "application/octet-stream",
        sizeKb: Math.max(1, Math.round(Number(raw.__receiptSize ?? 0) / 1024)),
        uploadedById: user.id,
        uploadedAt: new Date().toISOString(),
        status: "Active",
        accessRoles: ["Super Admin", "Business Admin"],
        simulated: true,
      });
    }
    const values = { ...raw };
    delete values.__receiptName;
    delete values.__receiptType;
    delete values.__receiptSize;

    const schema = buildZodSchema(resource.fields, db);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { error: "Validation failed.", fieldErrors } as const;
    }

    const data = parsed.data as Record<string, unknown>;
    const refineError = resource.refine?.(data, db) ?? null;
    if (refineError) return { error: refineError, fieldErrors: { _root: refineError } } as const;

    const collection = db[resource.collection] as unknown as Record<string, unknown>[];

    if (resource.key === "hospitals") {
      const dup = collection.find((h) => String(h.name).toLowerCase() === String(data.name).toLowerCase());
      if (dup) return { error: `A hospital named "${data.name}" already exists.`, fieldErrors: { name: "Duplicate hospital name." } } as const;
    }
    if (resource.key === "candidates") {
      const dup = collection.find((c) => String(c.registrationNumber) === String(data.registrationNumber));
      if (dup)
        return { error: "A candidate with this registration number already exists in the pool.", fieldErrors: { registrationNumber: "Duplicate in demo pool." } } as const;
    }
    if (resource.key === "candidates") {
      data.documents = [
        { id: `CD-${Date.now()}-R`, candidateId: "", type: "Resume", name: `${String(data.name).replace(/^Dr\. /, "").replace(/ /g, "_")}_CV.pdf`, uploadedAt: new Date().toISOString(), status: "Uploaded", simulated: true },
      ];
    }
    if (resource.key === "shifts") {
      const clash = db.shifts.find(
        (s) => s.employeeId === data.employeeId && s.date === data.date && s.type !== "On Call"
      );
      if (clash)
        return { error: `Shift conflict: this person already has a ${clash.type.toLowerCase()} shift on ${data.date} (${clash.startTime} to ${clash.endTime}).` } as const;
      const dep = db.deployments.find((d) => d.id === data.deploymentId);
      if (dep && (String(data.date) < dep.startDate || String(data.date) > dep.endDate))
        return { error: `${data.date} is outside the deployment window (${dep.startDate} to ${dep.endDate}).` } as const;
    }
    if (resource.key === "leave-requests") {
      const overlap = db.leaveRequests.find(
        (l) =>
          l.employeeId === data.employeeId &&
          l.status === "Approved" &&
          !(l.toDate < String(data.toDate) || l.fromDate > String(data.toDate))
      );
      if (overlap) return { error: `An approved ${overlap.type} already covers these dates.` } as const;
    }
    if (resource.key === "deployments" && Number(data.monthlyHospitalBilling) <= Number(data.monthlySalary)) {
      return { error: "Hospital billing must exceed the doctor's monthly salary for the deployment to be viable." } as const;
    }
    if (resource.key === "payments") {
      const inv = db.invoices.find((i) => i.id === data.invoiceId);
      if (!inv) return { error: "Select a valid invoice." } as const;
      if (Number(data.amount) > inv.outstanding)
        return { error: `Receipt of ₹${Number(data.amount).toLocaleString("en-IN")} exceeds the outstanding balance of ₹${inv.outstanding.toLocaleString("en-IN")}.` } as const;
    }

    const defs = resource.defaults?.(db, user) ?? {};
    const prepared = resource.prepare ? resource.prepare(data, db, user) : data;
    const id = newId(ID_PREFIX[resourceKey] ?? "REC", collection, 4);
    const record: Record<string, unknown> = { id };
    for (const [k, v] of Object.entries(defs)) if (v !== undefined) record[k] = v;
    Object.assign(record, prepared);
    if (uploadDocId) record.documentId = uploadDocId;
    if (resource.key === "candidates") {
      (record.documents as { candidateId: string }[] | undefined)?.forEach((d) => (d.candidateId = id));
    }

    if (resource.key === "salary-structures") {
      const emp = db.employees.find((e) => e.id === record.employeeId);
      if (emp) emp.salaryStructureId = id;
    }
    if (resource.key === "payments") {
      record.recordedById = user.id;
      record.simulated = true;
      const inv = db.invoices.find((i) => i.id === record.invoiceId)!;
      inv.amountPaid = Math.round((inv.amountPaid + Number(record.amount)) * 100) / 100;
      inv.outstanding = Math.max(0, Math.round((inv.totalAmount - inv.amountPaid) * 100) / 100);
      inv.status =
        inv.outstanding <= 0 ? "Paid" : inv.amountPaid > 0 ? "Partially Paid" : inv.status === "Draft" ? "Sent" : inv.status;
      record.hospitalId = inv.hospitalId;
      notify(db, {
        title: "Payment recorded",
        body: `Receipt ${record.paymentNo} of ₹${Number(record.amount).toLocaleString("en-IN")} applied to ${inv.invoiceNo}.`,
        type: "Payment",
        severity: "Success",
        link: "/erp/payments",
        audience: ["Super Admin", "Finance Manager", "Business Admin"],
      });
    }
    if (resource.key === "attendance") {
      record.approvedBy = undefined;
    }

    collection.unshift(record);
    resource.afterCreate?.(record, db, user);

    if (["hospitals", "leads", "contracts", "candidates", "deployments", "invoices", "employees"].includes(resource.key)) {
      recordActivity(db, {
        entity: resource.label,
        entityId: id,
        hospitalId: typeof record.hospitalId === "string" ? record.hospitalId : undefined,
        type: `${resource.label} Created`,
        summary: `${resource.label} created by ${user.name}.`,
        actorId: user.id,
      });
    }
    recordAudit(db, user, "CREATE", resource.labelPlural, id, `${user.name} created ${resource.label.toLowerCase()} ${id}.`, undefined, record);

    if (resource.key === "expenses") {
      notify(db, {
        title: "Expense awaiting approval",
        body: `${user.name} submitted a ${record.category} expense of ₹${Number(record.amount).toLocaleString("en-IN")}.`,
        type: "Approval",
        severity: "Info",
        link: "/erp/expenses",
        audience: ["Super Admin", "Finance Manager", "Business Admin"],
      });
    }
    if (resource.key === "requirements") {
      notify(db, {
        title: "New hospital requirement",
        body: `${db.hospitals.find((h) => h.id === record.hospitalId)?.name} requires ${record.count} x ${record.designation}.`,
        type: "System",
        severity: record.priority === "Critical" ? "Critical" : "Warning",
        link: "/operations/requirements",
        audience: ["Super Admin", "Operations Manager", "Recruiter", "HR Manager"],
      });
    }
    if (resource.key === "service-requests") {
      notify(db, {
        title: "Service request raised",
        body: `${record.requestNo}: ${record.subject}`,
        type: "Approval",
        severity: record.priority === "Critical" ? "Critical" : "Warning",
        link: "/operations/service-requests",
        audience: ["Super Admin", "Operations Manager", "Business Admin"],
      });
    }

    return { record } as const;
  });

  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error, fieldErrors: (outcome as { fieldErrors?: Record<string, string> }).fieldErrors }, { status: 422 });
  }
  return NextResponse.json({ ok: true, row: outcome.record }, { status: 201 });
}
