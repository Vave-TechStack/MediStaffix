/**
 * Demo data layer.
 *
 * A single JSON document on disk backs the demonstration environment. All reads
 * and writes go through this module so that:
 *   - the dataset survives page refreshes and server restarts,
 *   - every mutation is written together with an audit log entry,
 *   - swapping the demo for PostgreSQL/Prisma means reimplementing this module
 *     and the `src/app/api/**` route handlers only, not the UI.
 *
 * Production target: `prisma/schema.prisma` mirrors these entity shapes.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { buildSeedDatabase } from "./seed";
import type { ActivityLog, AuditLog, Database, Role, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type Cache = { db: Database; mtimeMs: number } | null;
const globalRef = globalThis as unknown as { __medistaffixDb?: Cache };
let globalCache: Cache | null = null;

/**
 * Serverless deployments (Vercel, Lambda) ship a read-only filesystem outside
 * `/tmp`, so persisting to `data/db.json` throws. The demo still has to run
 * there, so fall back to holding the dataset in memory for the life of the
 * instance. Writes survive within that instance but not across cold starts.
 */
let memoryOnly = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const memoryRef = globalThis as unknown as { __medistaffixMemoryDb?: Database };

async function fileExists() {
  try {
    await fs.access(DB_FILE);
    return true;
  } catch {
    return false;
  }
}

async function writeFile(db: Database) {
  if (memoryOnly) {
    memoryRef.__medistaffixMemoryDb = db;
    globalCache = { db, mtimeMs: 0 };
    return;
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db), "utf8");
    await fs.rename(tmp, DB_FILE);
    const stat = await fs.stat(DB_FILE);
    globalCache = { db, mtimeMs: stat.mtimeMs };
  } catch (err) {
    // A read-only or full disk must not take the demo down; degrade to memory.
    console.warn("[store] disk write failed, continuing in memory only:", (err as Error).message);
    memoryOnly = true;
    memoryRef.__medistaffixMemoryDb = db;
    globalCache = { db, mtimeMs: 0 };
  }
}

export async function getDb(): Promise<Database> {
  if (memoryOnly) {
    const existing = memoryRef.__medistaffixMemoryDb;
    if (existing) return existing;
    const seeded = buildSeedDatabase();
    memoryRef.__medistaffixMemoryDb = seeded;
    globalCache = { db: seeded, mtimeMs: 0 };
    return seeded;
  }
  if (!(await fileExists())) {
    const seeded = buildSeedDatabase();
    await writeFile(seeded);
    return seeded;
  }
  const stat = await fs.stat(DB_FILE);
  const cached = globalCache ?? globalRef.__medistaffixDb ?? null;
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.db;
  const raw = await fs.readFile(DB_FILE, "utf8");
  const db = JSON.parse(raw) as Database;
  globalCache = { db, mtimeMs: stat.mtimeMs };
  return db;
}

export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDb();
  const result = await fn(db);
  await writeFile(db);
  return result;
}

export async function resetDb(): Promise<Database> {
  const db = buildSeedDatabase();
  await writeFile(db);
  return db;
}

/* ------------------------------------------------------------------ */
/* IDs, audit, activity                                                */
/* ------------------------------------------------------------------ */

export function newId(prefix: string, existing: readonly { id: string }[] | readonly unknown[], pad = 4) {
  const rows = existing as readonly { id: string }[];
  let n = rows.length + 1;
  const ids = new Set(rows.map((e) => e.id));
  let candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  while (ids.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  }
  return candidate;
}

export function seqId(prefix: string, seq: number, pad = 4) {
  return `${prefix}-${String(seq).padStart(pad, "0")}`;
}

export function recordAudit(
  db: Database,
  actor: User | undefined,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): AuditLog {
  const log: AuditLog = {
    id: `AUD-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    at: new Date().toISOString(),
    actorId: actor?.id ?? "SYSTEM",
    actorName: actor?.name ?? "System",
    actorRole: actor?.role ?? "Super Admin",
    action,
    entity,
    entityId,
    summary,
    ip: "127.0.0.1 (demo)",
    before,
    after,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 5000) db.auditLogs.length = 5000;
  return log;
}

export function recordActivity(
  db: Database,
  entry: Omit<ActivityLog, "id" | "at"> & { at?: string }
): ActivityLog {
  const log: ActivityLog = {
    id: `ACT-${randomUUID().slice(0, 8).toUpperCase()}`,
    at: entry.at ?? new Date().toISOString(),
    entity: entry.entity,
    entityId: entry.entityId,
    hospitalId: entry.hospitalId,
    type: entry.type,
    summary: entry.summary,
    actorId: entry.actorId,
  };
  db.activityLogs.unshift(log);
  if (db.activityLogs.length > 5000) db.activityLogs.length = 5000;
  return log;
}

export function notify(
  db: Database,
  n: {
    title: string;
    body: string;
    type: "Approval" | "Recruitment" | "Shift" | "Contract" | "Payment" | "Payroll" | "System";
    severity: "Info" | "Success" | "Warning" | "Critical";
    link: string;
    audience: Role[] | "All";
  }
) {
  db.notifications.unshift({
    id: `NTF-${randomUUID().slice(0, 8).toUpperCase()}`,
    title: n.title,
    body: n.body,
    type: n.type,
    severity: n.severity,
    link: n.link,
    audience: n.audience,
    createdAt: new Date().toISOString(),
    readBy: [],
  });
  if (db.notifications.length > 500) db.notifications.length = 500;
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export function hospitalById(db: Database, id: string) {
  return db.hospitals.find((h) => h.id === id);
}
export function employeeById(db: Database, id: string) {
  return db.employees.find((e) => e.id === id);
}
export function userById(db: Database, id: string) {
  return db.users.find((u) => u.id === id);
}
export function candidateById(db: Database, id: string) {
  return db.candidates.find((c) => c.id === id);
}
export function contractById(db: Database, id: string) {
  return db.contracts.find((c) => c.id === id);
}
export function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
