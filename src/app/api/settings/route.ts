/**
 * Workspace settings.
 *
 * A single JSON document holds the company profile, statutory configuration and
 * operational defaults. Every module reads these values, so a change here
 * immediately changes payroll deductions, invoice GST and expiry alerting.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDb, mutate, recordAudit } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, "settings:manage")) {
    return NextResponse.json({ error: `Role "${user.role}" cannot view workspace settings.` }, { status: 403 });
  }
  const db = await getDb();
  return NextResponse.json({ settings: db.settings });
}

/** Only the keys a client may change; nested statutory keys are whitelisted too. */
const SCALAR_KEYS: (keyof Settings)[] = [
  "companyName",
  "tagline",
  "supportEmail",
  "supportPhone",
  "registeredAddress",
  "gstin",
  "defaultPaymentTerms",
  "defaultInvoiceDueDays",
  "standardShiftHours",
  "overtimeRateMultiplier",
  "documentExpiryAlertDays",
  "contractExpiryAlertDays",
  "demoMode",
  "dataRetainedFrom",
];

export async function PATCH(request: Request) {
  const limit = rateLimit("settings:update", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, "settings:manage")) {
    return NextResponse.json({ error: `Role "${user.role}" cannot change workspace settings.` }, { status: 403 });
  }

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });

  const errors: Record<string, string> = {};
  const next: Partial<Settings> = {};
  for (const key of SCALAR_KEYS) {
    if (!(key in raw)) continue;
    const value = raw[key];
    switch (key) {
      case "defaultInvoiceDueDays":
      case "standardShiftHours":
      case "documentExpiryAlertDays":
      case "contractExpiryAlertDays": {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0 || n > 3650) errors[key] = "Enter a number between 0 and 3650.";
        else next[key] = n;
        break;
      }
      case "overtimeRateMultiplier": {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1 || n > 5) errors[key] = "Overtime multiplier must be between 1x and 5x.";
        else next[key] = n;
        break;
      }
      case "demoMode":
        next.demoMode = Boolean(value);
        break;
      default:
        next[key] = String(value ?? "") as never;
    }
  }

  if (raw.statutory && typeof raw.statutory === "object") {
    const statutory = { ...(raw.statutory as Record<string, unknown>) };
    const invalidPercent = (v: unknown, name: string) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) errors[`statutory.${name}`] = "Percent must be between 0 and 100.";
    };
    if (statutory.providentFund && typeof statutory.providentFund === "object") {
      const pf = statutory.providentFund as Record<string, unknown>;
      if ("percent" in pf) invalidPercent(pf.percent, "providentFund.percent");
      if ("wageCeiling" in pf && Number(pf.wageCeiling) < 0) errors["statutory.providentFund.wageCeiling"] = "Wage ceiling cannot be negative.";
    }
    if (statutory.esi && typeof statutory.esi === "object") {
      const esi = statutory.esi as Record<string, unknown>;
      if ("percent" in esi) invalidPercent(esi.percent, "esi.percent");
    }
    if (statutory.invoiceTax && typeof statutory.invoiceTax === "object") {
      invalidPercent((statutory.invoiceTax as Record<string, unknown>).percent, "invoiceTax.percent");
    }
    if (statutory.serviceCharge && typeof statutory.serviceCharge === "object") {
      invalidPercent((statutory.serviceCharge as Record<string, unknown>).percent, "serviceCharge.percent");
    }
    next.statutory = statutory as never;
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Validation failed.", fieldErrors: errors }, { status: 422 });
  }

  await mutate((db) => {
    const before = db.settings;
    db.settings = { ...before, ...next } as Settings;
    recordAudit(
      db,
      user,
      "UPDATE",
      "Settings",
      "SETTINGS",
      `${user.name} updated workspace settings: ${Object.keys(next).join(", ") || "no changes"}.`,
      before as unknown as Record<string, unknown>,
      db.settings as unknown as Record<string, unknown>
    );
  });

  const fresh = await getDb();
  return NextResponse.json({ ok: true, settings: fresh.settings });
}
