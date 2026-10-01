/**
 * Domain action dispatcher.
 *
 * Every workflow that spans more than one module goes through this endpoint so
 * that authorisation, audit logging and rate limiting are applied in exactly
 * one place. Each action declares the permission it needs; the check happens on
 * the server regardless of what the client believes about the user's role.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
import { getDb, mutate } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import * as crm from "@/lib/workflows/crm";
import * as recruitment from "@/lib/workflows/recruitment";
import * as operations from "@/lib/workflows/operations";
import * as payroll from "@/lib/workflows/payroll";
import * as finance from "@/lib/workflows/finance";
import * as hr from "@/lib/workflows/hr";
import * as system from "@/lib/workflows/system";
import type { Database, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entry = {
  permission: Permission;
  run: (db: Database, user: User, payload: Record<string, unknown>) => ReturnType<typeof crm.moveLead>;
  readOnly?: boolean;
};

const ACTIONS: Record<string, Entry> = {
  /* CRM */
  "lead.move": { permission: "crm:leads:manage", run: crm.moveLead },
  "lead.convert": { permission: "crm:hospitals:manage", run: crm.convertLead },
  "lead.activity": { permission: "crm:leads:manage", run: crm.logLeadActivity },
  "followup.complete": { permission: "crm:leads:manage", run: crm.completeFollowUp },
  "contract.renew": { permission: "crm:contracts:manage", run: crm.renewContract },

  /* Recruitment */
  "application.stage": { permission: "recruitment:candidates:manage", run: recruitment.moveApplication },
  "candidate.verify": { permission: "recruitment:candidates:manage", run: recruitment.setVerification },
  "interview.complete": { permission: "recruitment:interviews:manage", run: recruitment.completeInterview },
  "offer.release": { permission: "recruitment:offers:manage", run: recruitment.releaseOffer },
  "onboarding.complete": { permission: "recruitment:offers:manage", run: recruitment.onboarding },
  "onboarding.available-doctors": { permission: "workforce:deployments:view", run: (_db, _u, p) => ({ ok: true, message: "ok", data: { doctors: operations.availableDoctors(_db, p.category as string, p.specialization as string) } }) },

  /* Operations */
  "requirement.allocate": { permission: "workforce:deployments:manage", run: operations.allocateDoctor },
  "deployment.status": { permission: "workforce:deployments:manage", run: operations.setDeploymentStatus },
  "deployment.replace": { permission: "workforce:deployments:manage", run: operations.requestReplacement },
  "shift.swap": { permission: "hrm:shifts:manage", run: operations.requestShiftSwap },
  "shift.swap-decide": { permission: "hrm:shifts:manage", run: operations.resolveShiftSwap },
  "service-request.update": { permission: "workforce:deployments:manage", run: operations.updateServiceRequest },

  /* Payroll */
  "payroll.preview": { permission: "payroll:process", run: payroll.previewPayroll, readOnly: true },
  "payroll.compute": { permission: "payroll:process", run: payroll.commitPayrollRun },
  "payroll.advance": { permission: "payroll:approve", run: payroll.advancePayrollRun },
  "payroll.adjust": { permission: "payroll:process", run: payroll.adjustPayrollItem },
  "payroll.payslips": { permission: "payroll:process", run: payroll.generatePayslips },
  "salary.revise": { permission: "payroll:process", run: payroll.reviseSalary },

  /* Finance */
  "invoice.preview": { permission: "erp:invoices:manage", run: finance.previewInvoice, readOnly: true },
  "invoice.generate": { permission: "erp:invoices:manage", run: finance.generateInvoice },
  "invoice.advance": { permission: "erp:invoices:manage", run: finance.advanceInvoice },
  "invoice.approve": { permission: "erp:invoices:approve", run: finance.approveInvoice },
  "payment.record": { permission: "erp:payments:manage", run: finance.recordPayment },
  "expense.decide": { permission: "erp:expenses:approve", run: finance.decideExpense },
  "po.decide": { permission: "erp:procurement:manage", run: finance.decidePurchaseOrder },

  /* HR */
  "leave.decide": { permission: "hrm:leave:manage", run: hr.decideLeave },
  "attendance.correction": { permission: "hrm:attendance:manage", run: hr.requestCorrection },
  "attendance.approve": { permission: "hrm:attendance:manage", run: hr.approveAttendance },

  /* System */
  "notification.read": { permission: "dashboard:view", run: system.markNotifications },
  "document.template": { permission: "documents:manage", run: system.renderTemplate },
  "demo.reset": { permission: "settings:manage", run: (_db, _u, _p) => ({ ok: true, message: "reset" }) },
};

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const limit = rateLimit(`action:${action}`, 240, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const entry = ACTIONS[action];
  if (!entry) return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 404 });
  if (!can(user.role, entry.permission)) {
    return NextResponse.json(
      { error: `Role "${user.role}" is not permitted to run "${action}" (requires ${entry.permission}).` },
      { status: 403 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (action === "demo.reset") {
    const before = await getDb();
    if (!before.settings.demoMode) {
      return NextResponse.json({ error: "Demo reset is disabled on this deployment." }, { status: 403 });
    }
    const { resetDb, recordAudit } = await import("@/lib/store");
    await resetDb();
    await mutate((db) => {
      recordAudit(db, user, "DEMO_RESET", "Database", "SYSTEM", `${user.name} reset the demonstration dataset.`);
    });
    const fresh = await getDb();
    return NextResponse.json({
      ok: true,
      message: `Demonstration data regenerated: ${fresh.hospitals.length} hospitals, ${fresh.employees.length} employees, ${fresh.deployments.length} deployments.`,
    });
  }

  const result = await mutate((db) => entry.run(db, user, payload));
  if (!result.ok) {
    return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: result.status ?? 422 });
  }
  return NextResponse.json(result);
}

export async function GET(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (action === "templates") {
    if (!can(user.role, "documents:view")) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
    return NextResponse.json({ templates: system.listTemplates() });
  }
  if (action === "resources") {
    return NextResponse.json({ resources: system.resourceCatalogue(user) });
  }
  if (action === "available-doctors") {
    if (!can(user.role, "workforce:deployments:view")) return NextResponse.json({ error: "Not permitted." }, { status: 403 });
    const url = new URL(request.url);
    const db = await getDb();
    return NextResponse.json({
      doctors: operations.availableDoctors(db, url.searchParams.get("category") ?? undefined, url.searchParams.get("specialization") ?? undefined),
    });
  }
  return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 404 });
}
