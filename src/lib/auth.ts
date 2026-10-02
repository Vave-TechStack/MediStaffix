/**
 * Demo authentication and session handling.
 *
 * Sessions are stateless JWTs (HS256) stored in an httpOnly cookie. The demo
 * build issues tokens for seeded users and exposes a role switcher so an
 * evaluator can explore every permission set. A production deployment would
 * replace `authenticate()` with a credential check against hashed passwords and
 * would disable the demo role switcher (see `db.settings.demoMode`).
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Database, User } from "./types";
import { can, type Permission } from "./rbac";
import { getDb } from "./store";
import type { PortalScope } from "./resource-types";

export const SESSION_COOKIE = "msx_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.AUTH_SECRET ?? "medistaffix-demo-secret-not-for-production";
  return new TextEncoder().encode(value.padEnd(32, "0"));
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  hospitalId?: string;
  employeeId?: string;
  avatarColor: string;
  department: string;
}

export async function createSessionToken(user: User) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    hospitalId: user.hospitalId,
    employeeId: user.employeeId,
    avatarColor: user.avatarColor,
    department: user.department,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as User["role"],
      hospitalId: payload.hospitalId as string | undefined,
      employeeId: payload.employeeId as string | undefined,
      avatarColor: payload.avatarColor as string,
      department: payload.department as string,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const db = await getDb();
  return db.users.find((u) => u.id === session.id) ?? null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * Demo credential check. The seeded users all share the published demo password
 * shown on the sign-in screen; no real credential store exists in this build.
 */
export function authenticate(email: string, password: string, db: Database) {
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;
  if (user.status !== "Active") return null;
  if (password !== user.passwordHint) return null;
  return user;
}

export async function requirePermission(permission: Permission): Promise<
  { user: User; db: Database } | { error: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (!can(user.role, permission)) {
    return {
      error: Response.json(
        { error: `Role "${user.role}" is not permitted to perform this action (${permission}).` },
        { status: 403 }
      ),
    };
  }
  const db = await getDb();
  return { user, db };
}

/** Restrict a query result to the records a portal user is allowed to see. */
export function scopeToPortal<T extends { hospitalId?: string; employeeId?: string }>(
  user: User,
  rows: T[]
): T[] {
  if (user.role === "Hospital Client" && user.hospitalId) {
    return rows.filter((r) => r.hospitalId === user.hospitalId);
  }
  if (user.role === "Doctor" && user.employeeId) {
    return rows.filter((r) => r.employeeId === user.employeeId);
  }
  return rows;
}

/**
 * Portal scoping for collection endpoints.
 *
 * Scoping must be deny-by-default: a portal role is only ever shown rows it is
 * entitled to, and any row that cannot be attributed to the user is withheld.
 * A resource opts out explicitly with `portalScope: "none"`, so adding a new
 * module cannot silently leak another hospital's records.
 */
export function scopeRowsToPortal<T extends Record<string, unknown>>(
  user: User,
  rows: T[],
  portalScope: PortalScope | undefined,
  db?: Database,
  portalMatch?: (row: Record<string, unknown>, db: Database, user: User) => boolean
): T[] {
  if (portalScope === "none") return rows;
  if (user.role === "Hospital Client") {
    if (!user.hospitalId) return [];
    const hospitalId = user.hospitalId;
    return rows.filter((r) => {
      // `hospitals` rows carry their own id rather than a hospitalId back-reference.
      if ((r.hospitalId ?? r.id) === hospitalId) return true;
      return db && portalMatch ? portalMatch(r, db, user) : false;
    });
  }
  if (user.role === "Doctor") {
    if (!user.employeeId) return [];
    const employeeId = user.employeeId;
    // A hospital-dimension resource still has to be reachable by a doctor when
    // the resource can attribute a row to a person (their own deployment, say).
    if (portalScope === "hospital" && !(db && portalMatch)) return [];
    return rows.filter((r) => {
      if (r.employeeId === employeeId || (r.id === employeeId && !r.employeeId)) return true;
      return db && portalMatch ? portalMatch(r, db, user) : false;
    });
  }
  return rows;
}

export function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"X".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function maskRegistrationNumber(value: string) {
  const parts = value.split("/");
  if (parts.length !== 3) return value;
  return `${parts[0]}/•••••/${parts[2]}`;
}
