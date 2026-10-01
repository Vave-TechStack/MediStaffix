/**
 * Resource metadata for the client.
 *
 * The list UI is generated from this document: columns drive the table, filters
 * drive the filter bar, and `fields` drive the create/edit form — which builds
 * the same Zod schema the POST endpoint validates with. A resource therefore
 * gets a complete CRUD screen with no per-page code.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getResource } from "@/lib/resources";
import { resolveField, type FieldOption, type FilterDef } from "@/lib/resource-types";
import { getDb } from "@/lib/store";
import type { Database } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveOptions(source: FilterDef["options"], db: Database): FieldOption[] {
  if (!source) return [];
  return typeof source === "function" ? source(db) : source;
}

export async function GET(_request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const resource = getResource(key);
  if (!resource) return NextResponse.json({ error: `Unknown resource "${key}".` }, { status: 404 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, resource.view)) {
    return NextResponse.json({ error: `Role "${user.role}" cannot view ${resource.labelPlural}.` }, { status: 403 });
  }

  const db = await getDb();
  const manage = can(user.role, resource.manage);

  const fields = resource.fields.map((f) => resolveField(f, db));

  const filters = resource.filters
    .map((f) => ({ field: f.field, label: f.label, options: resolveOptions(f.options, db) }))
    .filter((f) => f.options.length > 0);

  return NextResponse.json({
    key: resource.key,
    collection: resource.collection,
    label: resource.label,
    labelPlural: resource.labelPlural,
    description: resource.description,
    icon: resource.icon,
    titleField: resource.titleField ?? "name",
    subtitleField: resource.subtitleField,
    searchPlaceholder: resource.searchPlaceholder ?? `Search ${resource.labelPlural.toLowerCase()}…`,
    searchFields: resource.searchFields ?? [],
    canCreate: manage && fields.some((f) => !f.readOnly),
    canEdit: manage && fields.some((f) => !f.readOnly),
    canDelete: manage && !resource.blockDelete,
    immutableFields: resource.immutableFields ?? [],
    detailHref: undefined as string | undefined,
    fields,
    columns: resource.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type ?? "text",
      align: c.align,
      width: c.width,
    })),
    filters,
    rowsAsCounts: {
      hospitals: db.hospitals.length,
      employees: db.employees.length,
    },
    lookups: {
      hospitals: db.hospitals.map((h) => ({ value: h.id, label: h.name })),
      doctors: db.employees.filter((e) => e.doctorProfile).map((e) => ({ value: e.id, label: `${e.name} — ${e.doctorProfile!.specialisation}` })),
      employees: db.employees.map((e) => ({ value: e.id, label: e.name })),
      designations: [...new Set(db.employees.map((e) => e.designation))].map((d) => ({ value: d, label: d })),
    },
  });
}
