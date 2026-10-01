/**
 * Read-only audit trail.
 *
 * Every mutation in the store writes an audit entry; this endpoint exposes them
 * to users with the settings or users permission, since the audit trail is
 * deliberately not editable or deletable from the UI.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, "settings:manage") && !can(user.role, "users:manage")) {
    return NextResponse.json({ error: `Role "${user.role}" cannot view the audit log.` }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(5, Number(url.searchParams.get("pageSize") ?? "50")));
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const action = url.searchParams.get("action") ?? "";

  const db = await getDb();
  let rows = db.auditLogs.map((entry) => ({
    id: entry.id,
    at: entry.at,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    actor: db.users.find((u) => u.id === entry.actorId)?.name ?? "System",
    actorId: entry.actorId,
    summary: entry.summary,
    ip: entry.ip,
    changes: { before: entry.before, after: entry.after },
  }));

  if (action) rows = rows.filter((r) => r.action === action);
  if (q) {
    rows = rows.filter((r) =>
      [r.actor, r.entity, r.entityId, r.summary, r.action].join(" ").toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const total = rows.length;
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    rows: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    actions: [...new Set(db.auditLogs.map((e) => e.action))].sort(),
  });
}
