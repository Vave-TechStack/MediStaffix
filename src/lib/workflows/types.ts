import type { Database, User } from "../types";

export type ActionResult =
  | { ok: true; message: string; data?: Record<string, unknown> }
  | { ok: false; error: string; status?: number; fieldErrors?: Record<string, string> };

export type ActionHandler = (db: Database, user: User, payload: Record<string, unknown>) => ActionResult | Promise<ActionResult>;

export const ok = (message: string, data?: Record<string, unknown>): ActionResult => ({ ok: true, message, data });
export const fail = (error: string, status = 422, fieldErrors?: Record<string, string>): ActionResult => ({ ok: false, error, status, fieldErrors });

export function str(payload: Record<string, unknown>, key: string) {
  return String(payload[key] ?? "").trim();
}
export function num(payload: Record<string, unknown>, key: string, fallback = 0) {
  const v = Number(payload[key]);
  return Number.isFinite(v) ? v : fallback;
}
export function bool(payload: Record<string, unknown>, key: string) {
  return payload[key] === true || payload[key] === "true";
}
export function requireFields(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = payload[k];
    if (v === undefined || v === null || String(v).trim() === "") return `${k} is required.`;
  }
  return null;
}

export function addMonthsToPeriod(period: string, delta: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function lastPeriod() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
