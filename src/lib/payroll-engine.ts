/**
 * Payroll calculation engine.
 *
 * The engine reads the employee's configured salary structure, applies the
 * statutory rules held in `settings.statutory`, and combines them with approved
 * attendance and shift data to produce a payroll item.
 *
 * Statutory components are NOT asserted as universally applicable law. Each one
 * is switched on/off per salary structure and driven by configurable values,
 * because applicability (wage ceilings, slab rates, jurisdiction) varies. The
 * disclaimer in `settings.statutory.disclaimer` is shown wherever these figures
 * are displayed.
 */

import type {
  Database,
  Employee,
  PayrollItem,
  SalaryStructure,
  Settings,
  } from "./types";

const round0 = (n: number) => Math.round(n);

export interface PeriodStats {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  weeklyOffs: number;
  leaves: number;
  holidays: number;
  scheduledShifts: number;
  completedShifts: number;
  overtimeHours: number;
  workedHours: number;
  lateMinutes: number;
}

export function periodStats(db: Database, employeeId: string, period: string): PeriodStats {
  const attendance = db.attendance.filter((a) => a.employeeId === employeeId && a.date.startsWith(period));
  const shifts = db.shifts.filter((s) => s.employeeId === employeeId && s.date.startsWith(period));
  const leave = db.leaveRequests.filter(
    (l) => l.employeeId === employeeId && l.status === "Approved" && l.fromDate.startsWith(period)
  );
  const approvedLeaveDays = leave.reduce((s, l) => s + l.days, 0);

  return {
    presentDays: attendance.filter((a) => a.status === "Present" || a.status === "Late").length,
    absentDays: attendance.filter((a) => a.status === "Absent").length,
    halfDays: attendance.filter((a) => a.status === "Half Day").length,
    weeklyOffs: attendance.filter((a) => a.status === "Weekly Off").length,
    leaves: approvedLeaveDays,
    holidays: attendance.filter((a) => a.status === "Holiday").length,
    scheduledShifts: shifts.length,
    completedShifts: shifts.filter((s) => s.status === "Completed").length,
    overtimeHours: Math.round(attendance.reduce((s, a) => s + a.overtimeHours, 0) * 2) / 2,
    workedHours: Math.round(attendance.reduce((s, a) => s + a.workedHours, 0) * 2) / 2,
    lateMinutes: attendance.reduce((s, a) => s + a.lateMinutes, 0),
  };
}

export function daysInPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export interface PayrollAdjustment {
  incentives?: number;
  overtimeHours?: number;
  arrears?: number;
  reimbursements?: number;
  otherDeductions?: number;
  advanceRecovery?: number;
  remarks?: string;
}

export interface ComputedLine {
  item: Omit<PayrollItem, "id" | "runId">;
  warnings: string[];
}

export function computePayrollLine(
  db: Database,
  employee: Employee,
  period: string,
  adjustments: PayrollAdjustment = {}
): ComputedLine {
  const settings: Settings = db.settings;
  const struct: SalaryStructure | undefined = db.salaryStructures
    .filter((s) => s.employeeId === employee.id)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  const warnings: string[] = [];
  if (!struct) {
    warnings.push(`No salary structure is configured for ${employee.name}. A zero-value line was produced.`);
  }

  const dim = daysInPeriod(period);
  const stats = periodStats(db, employee.id, period);
  const ctc = struct?.ctc ?? 0;
  const full = ctc / 12;
  const daily = full / dim;
  const hourly = daily / (settings.standardShiftHours || 8);

  // Loss of pay: unexcused absence and half days. Approved leave is paid.
  const lopDays = stats.absentDays + stats.halfDays * 0.5;
  const lopDeduction = Math.min(full, daily * lopDays);

  const otHours = adjustments.overtimeHours ?? stats.overtimeHours;
  const overtimeAmount = Math.max(0, hourly * otHours * (settings.overtimeRateMultiplier || 1.75));

  const earnings = Math.max(0, full - lopDeduction + overtimeAmount);
  const basic = round0(earnings * ((struct?.basicPercent ?? 40) / 100));
  const hra = round0(earnings * ((struct?.hraPercent ?? 20) / 100));
  const conveyance = round0(earnings * ((struct?.conveyancePercent ?? 12) / 100));
  const special = Math.max(0, round0(earnings - basic - hra - conveyance));

  const incentives = Math.max(0, adjustments.incentives ?? 0);
  const arrears = Math.max(0, adjustments.arrears ?? 0);
  const reimbursements = Math.max(0, adjustments.reimbursements ?? 0);

  const statutory = settings.statutory;
  const ptax =
    struct?.professionalTaxEnabled && statutory.professionalTax.enabled
      ? struct.professionalTaxAmount || statutory.professionalTax.amountPerMonth
      : 0;
  const pfBase = Math.min(basic, statutory.providentFund.wageCeiling || basic);
  const pf = struct?.providentFundEnabled && statutory.providentFund.enabled
    ? round0(pfBase * (struct.providentFundPercent || statutory.providentFund.percent) / 100)
    : 0;
  const esi = struct?.esiEnabled && statutory.esi.enabled ? round0(earnings * (struct.esiPercent || statutory.esi.percent) / 100) : 0;
  const tdsApplicable = struct?.tdsApplicable && statutory.tds.enabled;
  const tds = tdsApplicable && struct && struct.tdsPercent > 0 ? round0((earnings + incentives) * (struct.tdsPercent / 100)) : 0;
  if (tdsApplicable && (struct?.tdsPercent ?? 0) === 0) {
    warnings.push(`${employee.name}: TDS is marked applicable but no rate is set on the salary structure.`);
  }

  const otherDeductions = Math.max(0, adjustments.otherDeductions ?? 0);
  const advanceRecovery = Math.max(0, adjustments.advanceRecovery ?? 0);

  const grossEarnings = round0(basic + hra + special + conveyance + incentives + overtimeAmount + arrears + reimbursements);
  const totalDeductions = round0(ptax + pf + esi + tds + otherDeductions + advanceRecovery);
  const netSalary = round0(grossEarnings - totalDeductions);

  const deployment = db.deployments.find(
    (d) => d.employeeId === employee.id && d.startDate <= `${period}-31` && d.endDate >= `${period}-01` && d.status !== "Terminated"
  );

  if (lopDays > 0) warnings.push(`${employee.name}: loss of pay applied for ${lopDays} day(s).`);
  if (pendingCorrections(db, employee.id, period)) warnings.push(`${employee.name}: attendance corrections are still pending approval.`);

  return {
    item: {
      employeeId: employee.id,
      deploymentId: deployment?.id,
      basic,
      hra,
      specialAllowance: special,
      conveyance,
      incentives,
      overtimeAmount,
      arrears,
      reimbursements,
      professionalTax: ptax,
      providentFund: pf,
      esi,
      tds,
      otherDeductions,
      advanceRecovery,
      grossEarnings,
      totalDeductions,
      netSalary,
      payableDays: Math.max(0, dim - lopDays),
      lossOfPayDays: lopDays,
      remarks: adjustments.remarks ?? (lopDays > 0 ? `Loss of pay for ${lopDays} day(s)` : ""),
    },
    warnings,
  };
}

export function pendingCorrections(db: Database, employeeId: string, period: string) {
  return db.attendance.some(
    (a) => a.employeeId === employeeId && a.date.startsWith(period) && a.correctionRequested && !a.approvedBy
  );
}

export function employeesEligibleFor(db: Database, period: string) {
  const periodEnd = `${period}-31`;
  return db.employees.filter(
    (e) =>
      !e.archived &&
      e.employmentStatus !== "Terminated" &&
      e.employmentStatus !== "Resigned" &&
      e.dateOfJoining <= periodEnd
  );
}
