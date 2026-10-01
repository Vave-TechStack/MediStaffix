/** HR workflows: leave decisions, attendance approvals and corrections. */

import { notify, recordActivity, recordAudit } from "../store";
import { fail, ok, str, type ActionResult } from "./types";
import type { Database, User } from "../types";

const LEAVE_KEY: Record<string, "casual" | "sick" | "earned" | "unpaid" | "compensatory"> = {
  "Casual Leave": "casual",
  "Sick Leave": "sick",
  "Earned Leave": "earned",
  "Unpaid Leave": "unpaid",
  "Compensatory Off": "compensatory",
};

export function decideLeave(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const leave = db.leaveRequests.find((l) => l.id === str(payload, "id"));
  if (!leave) return fail("Leave request was not found.", 404);
  if (leave.status !== "Pending") return fail(`This request is already ${leave.status.toLowerCase()}.`);
  const decision = str(payload, "decision");
  if (!["Approved", "Rejected", "Cancelled"].includes(decision)) return fail("Decision must be Approved, Rejected or Cancelled.");

  const employee = db.employees.find((e) => e.id === leave.employeeId);
  const balanceKey = LEAVE_KEY[leave.type];
  let balance = db.leaveBalances.find((b) => b.employeeId === leave.employeeId && b.year === new Date().getFullYear());

  if (decision === "Approved" && balanceKey && leave.type !== "Unpaid Leave") {
    const available = balance ? balance[balanceKey] : 0;
    if (available < leave.days) {
      return fail(`${employee?.name ?? "Employee"} has ${available} day(s) of ${leave.type} remaining but requested ${leave.days}.`);
    }
    if (balance) balance[balanceKey] = Math.round((available - leave.days) * 100) / 100;
  }
  if (!balance) {
    balance = { employeeId: leave.employeeId, year: new Date().getFullYear(), casual: 12, sick: 12, earned: 15, unpaid: 0, compensatory: 0 };
    db.leaveBalances.push(balance);
  }

  leave.status = decision as typeof leave.status;
  leave.approverId = user.id;
  leave.decidedAt = new Date().toISOString();
  leave.decisionNote = str(payload, "note") || (decision === "Approved" ? "Approved by the reporting manager." : "Rejected by the reporting manager.");

  if (decision === "Approved" && leave.type !== "Unpaid Leave") {
    db.deployments
      .filter((d) => d.employeeId === leave.employeeId && d.status === "Active")
      .forEach((d) => (d.status = "On Leave"));
    db.shifts
      .filter((s) => s.employeeId === leave.employeeId && s.date >= leave.fromDate && s.date <= leave.toDate)
      .forEach((s) => (s.notes = `Covered under approved ${leave.type} (${leave.id}).`));
  }

  notify(db, {
    title: `Leave ${decision.toLowerCase()}`,
    body: `${employee?.name ?? "Employee"} — ${leave.type} for ${leave.days} day(s) was ${decision.toLowerCase()}.`,
    type: "Approval",
    severity: decision === "Approved" ? "Success" : "Warning",
    link: "/workforce/leave",
    audience: ["Super Admin", "HR Manager", "Operations Manager"],
  });
  recordActivity(db, {
    entity: "Leave Request",
    entityId: leave.id,
    type: "Leave Decision",
    summary: `${employee?.name ?? "Employee"}'s ${leave.type} was ${decision.toLowerCase()} by ${user.name}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "LEAVE_DECISION", "Leave Requests", leave.id, `${user.name} set ${leave.id} to ${decision}.`);
  return ok(`${employee?.name ?? "Leave request"} — ${leave.type} ${decision.toLowerCase()}.`);
}

export function requestCorrection(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const record = db.attendance.find((a) => a.id === str(payload, "id"));
  if (!record) return fail("Attendance record was not found.", 404);
  record.correctionRequested = true;
  record.correctionReason = str(payload, "reason") || "Correction requested without a reason.";
  record.approvedBy = undefined;
  const employee = db.employees.find((e) => e.id === record.employeeId);
  notify(db, {
    title: "Attendance correction pending",
    body: `${employee?.name ?? "An employee"} requested a correction for ${record.date}.`,
    type: "Approval",
    severity: "Warning",
    link: "/workforce/attendance",
    audience: ["Super Admin", "HR Manager", "Operations Manager"],
  });
  recordAudit(db, user, "ATTENDANCE_CORRECTION", "Attendance", record.id, `${user.name} requested a correction for ${record.id}.`);
  return ok("Correction requested and routed for approval.");
}

export function approveAttendance(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [str(payload, "id")];
  const approve = payload.approve !== false && payload.approve !== "false";
  let count = 0;
  for (const id of ids) {
    const record = db.attendance.find((a) => a.id === id);
    if (!record || !record.correctionRequested) continue;
    if (approve) {
      record.approvedBy = user.id;
      if (str(payload, "status")) record.status = str(payload, "status") as typeof record.status;
      if (payload.workedHours !== undefined) record.workedHours = Number(payload.workedHours) || record.workedHours;
      if (payload.overtimeHours !== undefined) record.overtimeHours = Number(payload.overtimeHours) || 0;
    } else {
      record.correctionRequested = false;
      record.correctionReason = `${record.correctionReason ?? ""} (rejected by ${user.name})`.trim();
    }
    count += 1;
  }
  if (!count) return fail("No pending attendance corrections were found in the selection.");
  recordAudit(db, user, "ATTENDANCE_APPROVAL", "Attendance", ids.join(","), `${user.name} ${approve ? "approved" : "rejected"} ${count} attendance correction(s).`);
  return ok(`${count} correction(s) ${approve ? "approved" : "rejected"}.`);
}
