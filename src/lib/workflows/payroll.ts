/**
 * Payroll workflows.
 *
 * Lifecycle: preview → review → approve → finalise → payment tracking.
 * A run is only computed from approved attendance and the employee's own
 * configured structure. Finalised runs are locked; corrections after
 * finalisation are made by an adjustment in the next period, not by editing a
 * locked payroll item.
 */

import { notify, recordActivity, recordAudit } from "../store";
import { computePayrollLine, employeesEligibleFor } from "../payroll-engine";
import { fail, ok, str, type ActionResult } from "./types";
import type { Database, PayrollRun, User } from "../types";

const round0 = (n: number) => Math.round(n);

export function previewPayroll(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const period = str(payload, "period") || new Date().toISOString().slice(0, 7);
  const employees = employeesEligibleFor(db, period).filter((e) => e.doctorProfile || e.department !== "Clinical Staffing");
  const warnings: string[] = [];
  const lines = employees.map((emp) => {
    const computed = computePayrollLine(db, emp, period, {
      incentives: Number(payload.incentives ?? 0) || undefined,
    });
    warnings.push(...computed.warnings);
    return { employee: emp, item: computed.item };
  });

  const totalGross = round0(lines.reduce((s, l) => s + l.item.grossEarnings, 0));
  const totalDeductions = round0(lines.reduce((s, l) => s + l.item.totalDeductions, 0));
  const totalNet = round0(lines.reduce((s, l) => s + l.item.netSalary, 0));
  const totalOvertime = round0(lines.reduce((s, l) => s + l.item.overtimeAmount, 0));

  recordAudit(db, user, "PAYROLL_PREVIEW", "Payroll Runs", period, `${user.name} previewed payroll for ${period} (${lines.length} employees, net ${totalNet}).`);
  return ok(`Preview computed for ${period}.`, {
    period,
    totalEmployees: lines.length,
    totalGross,
    totalDeductions,
    totalNet,
    totalOvertime,
    warnings: [...new Set(warnings)].slice(0, 25),
    lines: lines.map((l) => ({
      ...l.item,
      name: l.employee.name,
      employeeCode: l.employee.employeeCode,
      designation: l.employee.designation,
    })),
  });
}

export function commitPayrollRun(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const period = str(payload, "period") || new Date().toISOString().slice(0, 7);
  let run = db.payrollRuns.find((r) => r.period === period);
  if (run?.locked) return fail(`Payroll for ${period} is finalised and locked. Record adjustments in a later period.`, 409);

  const employees = employeesEligibleFor(db, period);
  db.payrollItems = db.payrollItems.filter((i) => i.runId !== period);

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  const runId = run?.id ?? `PR-${period.replace("-", "")}`;

  for (const employee of employees) {
    const { item } = computePayrollLine(db, employee, period);
    db.payrollItems.push({ ...item, id: `PI-${runId}-${employee.id}`, runId });    totalGross += item.grossEarnings;
    totalDeductions += item.totalDeductions;
    totalNet += item.netSalary;
  }

  if (!run) {
    run = {
      id: runId,
      period,
      label: `Payroll ${period}`,
      status: "Under Review",
      totalEmployees: employees.length,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      preparedById: user.id,
      preparedAt: new Date().toISOString(),
      locked: false,
      notes: "",
    } satisfies PayrollRun;
    db.payrollRuns.unshift(run);
  }
  run.totalEmployees = employees.length;
  run.totalGross = round0(totalGross);
  run.totalDeductions = round0(totalDeductions);
  run.totalNet = round0(totalNet);
  run.status = "Under Review";
  run.preparedById = user.id;
  run.preparedAt = new Date().toISOString();

  recordAudit(db, user, "PAYROLL_COMPUTE", "Payroll Runs", runId, `${user.name} computed payroll for ${period}: ${employees.length} employees, net ${run.totalNet}.`);
  return ok(`Payroll for ${period} computed for ${employees.length} employees. Net payable ${run.totalNet}.`, { runId });
}

export function advancePayrollRun(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const period = str(payload, "period");
  const run = db.payrollRuns.find((r) => r.period === period);
  if (!run) return fail(`No payroll run exists for ${period}. Compute it first.`, 404);
  if (run.locked) return fail(`Payroll for ${period} is finalised and locked.`, 409);

  const target = str(payload, "status");
  const allowed: Record<string, string[]> = {
    "Pending Approval": ["Under Review"],
    Approved: ["Pending Approval", "Under Review"],
    Finalized: ["Approved"],
    Paid: ["Finalized"],
  };
  if (!allowed[target]) return fail(`"${target}" is not a valid payroll transition.`);
  if (!allowed[target].includes(run.status)) {
    return fail(`A run in "${run.status}" cannot move to "${target}". Expected one of: ${allowed[target].join(", ")}.`);
  }
  if (!db.payrollItems.some((i) => i.runId === run.id)) {
    return fail("This run has no computed payroll items. Compute the run before advancing it.");
  }

  const previousStatus = run.status;
  run.status = target as PayrollRun["status"];
  if (target === "Approved") {
    run.approvedById = user.id;
    run.approvedAt = new Date().toISOString();
  }
  if (target === "Finalized") {
    run.finalizedAt = new Date().toISOString();
    run.locked = true;
    db.payslips = db.payslips.filter((p) => p.runId !== run.id);
    for (const item of db.payrollItems.filter((i) => i.runId === run.id)) {
      db.payslips.push({
        id: `PSL-${run.id}-${item.employeeId}`,
        runId: run.id,
        itemId: item.id,
        employeeId: item.employeeId,
        period: run.period,
        netSalary: item.netSalary,
        generatedAt: new Date().toISOString(),
      });
    }
    notify(db, {
      title: "Payroll finalised",
      body: `Payroll for ${period} is locked. ${db.payslips.filter((p) => p.runId === run.id).length} payslips generated.`,
      type: "Payroll",
      severity: "Success",
      link: "/payroll/payslips",
      audience: ["Super Admin", "Payroll Manager", "Business Admin"],
    });
  }
  if (target === "Paid") {
    run.paidAt = new Date().toISOString();
    recordActivity(db, {
      entity: "Payroll Run",
      entityId: run.id,
      type: "Payroll Paid",
      summary: `Payroll ${period} marked paid. Disbursement is simulated in the demo environment.`,
      actorId: user.id,
    });
  }

  recordAudit(db, user, "PAYROLL_STATUS", "Payroll Runs", run.id, `${user.name} moved payroll ${period} to ${target}.`, { status: previousStatus }, { status: target });
  return ok(`Payroll ${period} is now ${target}.`, { run });
}

export function generatePayslips(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const run = db.payrollRuns.find((r) => r.id === str(payload, "runId") || r.period === str(payload, "period"));
  if (!run) return fail("Payroll run was not found.", 404);
  if (run.status === "Under Review" || run.status === "Draft") {
    return fail("Approve and finalise the payroll run before generating payslips.");
  }
  const items = db.payrollItems.filter((i) => i.runId === run.id);
  if (!items.length) return fail("This run has no payroll items.");

  let created = 0;
  for (const item of items) {
    if (db.payslips.some((p) => p.itemId === item.id)) continue;
    const docId = `DOC-${Date.now().toString(36).toUpperCase()}-${item.employeeId}`;
    db.payslips.push({
      id: `PSL-${run.id}-${item.employeeId}`,
      runId: run.id,
      itemId: item.id,
      employeeId: item.employeeId,
      period: run.period,
      netSalary: item.netSalary,
      generatedAt: new Date().toISOString(),
      documentId: docId,
    });
    const employee = db.employees.find((e) => e.id === item.employeeId);
    db.documents.unshift({
      id: docId,
      name: `Payslip_${run.period}_${item.employeeId}.pdf`,
      category: "Payslip",
      ownerType: "Employee",
      ownerId: item.employeeId,
      fileName: `Payslip_${run.period}_${item.employeeId}.pdf`,
      mimeType: "application/pdf",
      sizeKb: 60,
      uploadedById: user.id,
      uploadedAt: new Date().toISOString(),
      status: "Active",
      accessRoles: ["Super Admin", "Payroll Manager"],
      simulated: true,
    });
    void employee;
    created += 1;
  }
  recordAudit(db, user, "PAYSLIP_GENERATE", "Payroll Runs", run.id, `${user.name} generated ${created} payslip(s) for ${run.period}.`);
  return ok(`${created} payslip(s) generated for ${run.period}.`);
}

export function adjustPayrollItem(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const item = db.payrollItems.find((i) => i.id === str(payload, "itemId"));
  if (!item) return fail("Payroll item was not found.", 404);
  const run = db.payrollRuns.find((r) => r.id === item.runId);
  if (run?.locked) {
    return fail(`Payroll ${run.period} is finalised. Raise the adjustment in the next open period instead of editing a locked record.`, 409);
  }

  const before = { ...item };
  for (const key of ["incentives", "overtimeAmount", "arrears", "reimbursements", "otherDeductions", "advanceRecovery"] as const) {
    if (payload[key] !== undefined) item[key] = Math.max(0, Number(payload[key]) || 0);
  }
  if (str(payload, "remarks")) item.remarks = str(payload, "remarks");

  const employee = db.employees.find((e) => e.id === item.employeeId);
  if (employee) {
    const { item: recomputed } = computePayrollLine(db, employee, run?.period ?? new Date().toISOString().slice(0, 7), {
      incentives: item.incentives,
      overtimeHours: undefined,
      arrears: item.arrears,
      reimbursements: item.reimbursements,
      otherDeductions: item.otherDeductions,
      advanceRecovery: item.advanceRecovery,
      remarks: item.remarks,
    });
    Object.assign(item, {
      basic: recomputed.basic,
      hra: recomputed.hra,
      specialAllowance: recomputed.specialAllowance,
      conveyance: recomputed.conveyance,
      professionalTax: recomputed.professionalTax,
      providentFund: recomputed.providentFund,
      esi: recomputed.esi,
      tds: recomputed.tds,
      grossEarnings: recomputed.grossEarnings,
      totalDeductions: recomputed.totalDeductions,
      netSalary: recomputed.netSalary,
    });
  }
  if (run) {
    const items = db.payrollItems.filter((i) => i.runId === run.id);
    run.totalGross = round0(items.reduce((s, i) => s + i.grossEarnings, 0));
    run.totalDeductions = round0(items.reduce((s, i) => s + i.totalDeductions, 0));
    run.totalNet = round0(items.reduce((s, i) => s + i.netSalary, 0));
  }

  recordAudit(db, user, "PAYROLL_ADJUST", "Payroll Runs", item.runId, `${user.name} adjusted payroll item ${item.id}.`, before as unknown as Record<string, unknown>, item as unknown as Record<string, unknown>);
  return ok("Payroll line recalculated.");
}

export function reviseSalary(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const employee = db.employees.find((e) => e.id === str(payload, "employeeId"));
  if (!employee) return fail("Employee was not found.", 404);
  const ctc = Number(payload.ctc);
  if (!Number.isFinite(ctc) || ctc <= 0) return fail("Enter a valid annual CTC.", 422, { ctc: "Enter a positive annual CTC." });

  const seq = db.salaryStructures.length + 1;
  const previous = db.salaryStructures
    .filter((s) => s.employeeId === employee.id)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const id = `SAL-REV-${String(seq).padStart(4, "0")}`;
  db.salaryStructures.unshift({
    id,
    employeeId: employee.id,
    effectiveFrom: str(payload, "effectiveFrom") || new Date().toISOString().slice(0, 10),
    ctc,
    basicPercent: previous?.basicPercent ?? 40,
    hraPercent: previous?.hraPercent ?? 20,
    specialAllowancePercent: previous?.specialAllowancePercent ?? 28,
    conveyancePercent: previous?.conveyancePercent ?? 12,
    professionalTaxEnabled: previous?.professionalTaxEnabled ?? true,
    professionalTaxAmount: previous?.professionalTaxAmount ?? 200,
    providentFundEnabled: previous?.providentFundEnabled ?? true,
    providentFundPercent: previous?.providentFundPercent ?? 12,
    esiEnabled: ctc / 12 <= 21000,
    esiPercent: previous?.esiPercent ?? 0.75,
    tdsApplicable: ctc / 12 >= 25000,
    tdsPercent: previous?.tdsPercent ?? 0,
    revisionNote: str(payload, "revisionNote") || `Revised from ${previous?.ctc ?? 0} to ${ctc}.`,
    createdAt: new Date().toISOString(),
  });
  employee.salaryStructureId = id;
  recordAudit(db, user, "SALARY_REVISION", "Employees", employee.id, `${user.name} revised ${employee.name}'s annual CTC to ${ctc}.`);
  return ok(`Salary structure revised for ${employee.name}.`, { structureId: id });
}
