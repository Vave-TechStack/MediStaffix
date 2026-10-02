/**
 * Demo-only role switcher.
 *
 * Enabled only while `settings.demoMode` is true, which is the default in this
 * demonstration build. Two gates apply regardless of demo mode:
 *   - the caller must already hold a session, and
 *   - the caller must be permitted to manage users.
 *
 * Without the permission gate any authenticated portal account (a Doctor or a
 * Hospital Client) could switch itself to Super Admin and read payroll,
 * invoices, audit logs and settings. A production deployment additionally sets
 * `demoMode = false`, at which point this endpoint returns 403 and roles can
 * only change through a super-admin action in User & Role Management.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken, getSessionUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { mutate, recordAudit } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = rateLimit(`switch:${request.headers.get("x-forwarded-for") ?? "local"}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(actor.role, "users:manage")) {
    return NextResponse.json(
      { error: `Role "${actor.role}" is not permitted to change roles.` },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as { userId?: string } | null;
  if (!body?.userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  const result = await mutate((db) => {
    if (!db.settings.demoMode) {
      return { error: "The demo role switcher is disabled on this deployment." } as const;
    }
    const target = db.users.find((u) => u.id === body.userId);
    if (!target) return { error: "User not found." } as const;
    if (target.status !== "Active") return { error: "User is inactive." } as const;
    recordAudit(
      db,
      actor,
      "ROLE_SWITCH",
      "User",
      target.id,
      `Demo role switch: ${actor.name} → ${target.name} (${target.role}).`
    );
    return { user: target } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 403 });

  const token = await createSessionToken(result.user);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return NextResponse.json({ ok: true, role: result.user.role, name: result.user.name });
}
