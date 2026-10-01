import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------------------------- formatting ---------------------------- */

export const CURRENCY = "INR";

export function formatMoney(value: unknown, options: { compact?: boolean; symbol?: boolean } = {}) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  const symbol = options.symbol === false ? "" : "₹";
  if (options.compact && Math.abs(n) >= 100000) {
    const units: [number, string][] = [
      [10000000, "Cr"],
      [100000, "L"],
      [1000, "K"],
    ];
    for (const [div, suffix] of units) {
      if (Math.abs(n) >= div) {
        const v = n / div;
        return `${symbol}${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)}${suffix}`;
      }
    }
  }
  return `${symbol}${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "—";
}

export function formatPercent(value: unknown, digits = 1) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  const [h, m] = value.split(":");
  if (h === undefined || m === undefined) return value;
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return diff >= 0 ? "just now" : "in a moment";
  if (abs < hour) return diff >= 0 ? `${Math.round(abs / minute)}m ago` : `in ${Math.round(abs / minute)}m`;
  if (abs < day) return diff >= 0 ? `${Math.round(abs / hour)}h ago` : `in ${Math.round(abs / hour)}h`;
  if (abs < 7 * day) return diff >= 0 ? `${Math.round(abs / day)}d ago` : `in ${Math.round(abs / day)}d`;
  return formatDate(value);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ----------------------------- export ------------------------------ */

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]) {
  if (!rows.length) return "";
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Minimal print-to-PDF export. The browser's print dialog is used with a
 * print-optimised stylesheet, which produces a vector PDF with selectable text
 * — no client-side PDF library is required for the demo.
 */
export function exportPdf(filename: string, title: string) {
  const original = document.title;
  document.title = title;
  const cleanup = () => {
    document.title = original;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  void filename;
}

/* ------------------------------ misc ------------------------------- */

export function statusTone(value: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const v = value.toLowerCase();
  if (["active", "paid", "approved", "completed", "confirmed", "joined", "verified (demo record)", "won", "fully allocated", "accepted", "resolved", "closed", "filled", "reimbursed", "received", "on duty", "present", "renewed"].includes(v)) return "success";
  if (["pending", "expiring soon", "partially paid", "sent", "under review", "on hold", "on leave", "in progress", "acknowledged", "allocated", "proposed", "medium", "screening", "shortlisted", "late", "partially filled", "half day", "in negotiation", "negotiation", "proposal sent"].includes(v)) return "warning";
  if (["overdue", "rejected", "failed", "terminated", "churned", "expired", "critical", "discrepancy found", "missed", "absent", "unpaid", "cancelled", "lost", "blocked"].includes(v)) return "danger";
  if (["open", "new", "contacted", "qualified", "draft", "scheduled", "in person", "video call", "panel", "phone", "selected", "offer released", "interview scheduled", "interview completed", "prospect", "applied", "high", "low", "adjustments", "incentives", "deductions", "success"].includes(v)) return "info";
  return "neutral";
}

export function daysUntil(date: string) {
  return Math.floor((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86400000);
}

export function ageFromDob() {
  return undefined;
}
