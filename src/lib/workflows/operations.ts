/**
 * Operations workflows: doctor allocation, deployment lifecycle, replacement
 * handling, shift swaps and service requests.
 *
 * Allocation enforces the core staffing rule — a doctor can hold multiple
 * historical deployment records but never two overlapping active full-time
 * assignments — and raises the corresponding hospital requirement and
 * requisition records so downstream modules stay in sync.
 */

import { notify, recordActivity, recordAudit } from "../store";
import { fail, ok, str, type ActionResult } from "./types";
import type { Database, Deployment, ServiceRequest, User } from "../types";

export function availableDoctors(db: Database, category?: string, specialization?: string) {
  const activeEmployeeIds = new Set(
    db.deployments.filter((d) => d.status === "Active" || d.status === "Confirmed").map((d) => d.employeeId)
  );
  return db.employees
    .filter((e) => e.doctorProfile && !e.archived && e.employmentStatus === "Active" && !activeEmployeeIds.has(e.id))
    .filter((e) => (category ? e.doctorProfile!.categories.includes(category as never) : true))
    .filter((e) => (specialization ? e.doctorProfile!.specialisation === specialization : true))
    .map((e) => ({
      id: e.id,
      name: e.name,
      designation: e.designation,
      specialization: e.doctorProfile!.specialisation,
      experience: e.doctorProfile!.experienceYears,
      state: e.state,
      monthlyCost: db.salaryStructures.find((s) => s.employeeId === e.id)
        ? Math.round(db.salaryStructures.find((s) => s.employeeId === e.id)!.ctc / 12)
        : 0,
    }))
    .sort((a, b) => b.experience - a.experience);
}

export function allocateDoctor(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const requirement = db.requirements.find((r) => r.id === str(payload, "requirementId"));
  if (!requirement) return fail("Hospital requirement was not found.", 404);
  const employeeId = str(payload, "employeeId");
  const employee = db.employees.find((e) => e.id === employeeId);
  if (!employee) return fail("Select a doctor to allocate.", 400, { employeeId: "Required" });

  const clash = db.deployments.find(
    (d) => d.employeeId === employeeId && (d.status === "Active" || d.status === "Confirmed") && d.endDate >= requirement.targetDate
  );
  if (clash) {
    return fail(
      `${employee.name} already holds an active ${clash.status.toLowerCase()} deployment (${clash.deploymentCode}) until ${clash.endDate}. Overlapping active deployments are blocked.`,
      409
    );
  }

  const contract = db.contracts.filter((c) => c.hospitalId === requirement.hospitalId).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  if (!contract) {
    return fail(`${db.hospitals.find((h) => h.id === requirement.hospitalId)?.name} has no staffing contract. Create a contract before allocating doctors.`);
  }

  const rates = db.contractRates.filter((r) => r.contractId === contract.id);
  const rate = rates.find((r) => r.designation === employee.designation)?.rate ?? rates[0]?.rate;
  if (!rate) return fail(`Contract ${contract.number} has no billing rate for ${employee.designation}. Add a rate to the contract first.`);

  const startDate = str(payload, "startDate") || new Date().toISOString().slice(0, 10);
  const endDate = str(payload, "endDate") || (contract.endDate < requirement.targetDate ? contract.endDate : requirement.targetDate);

  const seq = db.deployments.length + 1;
  const id = `DEP-${String(seq).padStart(4, "0")}`;
  const structure = db.salaryStructures.filter((s) => s.employeeId === employeeId).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const monthlySalary = Math.round((structure?.ctc ?? 0) / 12);

  const deployment: Deployment = {
    id,
    deploymentCode: `MSX-DEP-${String(seq).padStart(4, "0")}`,
    hospitalId: requirement.hospitalId,
    employeeId,
    requisitionId: "",
    designation: employee.designation,
    startDate,
    endDate,
    shift: (str(payload, "shift") || employee.doctorProfile?.preferredShift || "General") as Deployment["shift"],
    monthlySalary,
    monthlyHospitalBilling: Math.round(rate),
    status: "Confirmed",
    reportingContact: requirement.requestedBy,
    reportingContactPhone: db.hospitals.find((h) => h.id === requirement.hospitalId)?.phone ?? "",
    contractId: contract.id,
    replacementStatus: "Not Required",
    notes: `Allocated against requirement ${requirement.referenceNo}.`,
    createdAt: new Date().toISOString(),
  };

  // Keep a matching requisition in step with the allocation.
  let requisition = db.requisitions.find((j) => j.hospitalId === requirement.hospitalId && j.designation === employee.designation);
  if (!requisition) {
    const rSeq = db.requisitions.length + 1;
    requisition = {
      id: `JOB-${String(rSeq).padStart(4, "0")}`,
      jobCode: `JOB-${String(rSeq).padStart(4, "0")}`,
      hospitalId: requirement.hospitalId,
      designation: employee.designation,
      category: requirement.category,
      qualification: requirement.requiredQualification,
      specialization: employee.doctorProfile?.specialisation ?? "General Medicine",
      vacancies: requirement.count,
      filled: 0,
      salaryBudget: monthlySalary,
      workLocation: `${db.hospitals.find((h) => h.id === requirement.hospitalId)?.city}, ${db.hospitals.find((h) => h.id === requirement.hospitalId)?.state}`,
      shiftRequirement: requirement.shiftRequirement,
      contractDuration: "Per contract term",
      joiningDeadline: requirement.targetDate,
      priority: requirement.priority,
      status: "Partially Filled",
      hiringManagerId: requirement.requestedBy,
      recruiterId: db.users.find((u) => u.role === "Recruiter")?.id ?? user.id,
      createdAt: new Date().toISOString(),
    };
    db.requisitions.unshift(requisition);
  }
  deployment.requisitionId = requisition.id;
  requisition.filled = Math.min(requisition.vacancies, requisition.filled + 1);
  requisition.status = requisition.filled >= requisition.vacancies ? "Filled" : "Partially Filled";

  db.deployments.unshift(deployment);

  requirement.allocated = Math.min(requirement.count, requirement.allocated + 1);
  requirement.status = requirement.allocated >= requirement.count ? "Fully Allocated" : "Partially Allocated";

  const letterId = `DOC-${Date.now().toString(36).toUpperCase()}`;
  db.documents.unshift({
    id: letterId,
    name: `${deployment.deploymentCode}_Deployment_Letter.pdf`,
    category: "Deployment Letter",
    ownerType: "Deployment",
    ownerId: id,
    fileName: `${deployment.deploymentCode}.pdf`,
    mimeType: "application/pdf",
    sizeKb: 95,
    uploadedById: user.id,
    uploadedAt: new Date().toISOString(),
    expiresAt: endDate,
    status: "Active",
    accessRoles: ["Super Admin", "Business Admin", "Operations Manager"],
    simulated: true,
  });
  deployment.letterId = letterId;

  notify(db, {
    title: "Doctor allocated",
    body: `${employee.name} allocated to ${db.hospitals.find((h) => h.id === requirement.hospitalId)?.name} starting ${startDate}.`,
    type: "Shift",
    severity: "Success",
    link: "/workforce/deployment",
    audience: ["Super Admin", "Operations Manager", "Business Admin"],
  });
  recordActivity(db, {
    entity: "Deployment",
    entityId: id,
    hospitalId: requirement.hospitalId,
    type: "Doctor Allocated",
    summary: `${employee.name} allocated as ${employee.designation} against ${requirement.referenceNo}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "ALLOCATE", "Deployments", id, `${user.name} allocated ${employee.name} to requirement ${requirement.referenceNo}.`);

  return ok(`${employee.name} allocated. Deployment ${deployment.deploymentCode} is confirmed from ${startDate}.`, { deployment });
}

export function setDeploymentStatus(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const deployment = db.deployments.find((d) => d.id === str(payload, "id"));
  if (!deployment) return fail("Deployment was not found.", 404);
  const status = str(payload, "status");

  if (status === "Active" && (deployment.status === "Completed" || deployment.status === "Terminated")) {
    return fail(`A ${deployment.status.toLowerCase()} deployment cannot be reactivated. Create a new deployment record instead.`);
  }
  const before = deployment.status;
  deployment.status = status as Deployment["status"];
  if (str(payload, "notes")) deployment.notes = str(payload, "notes");

  if (status === "Completed" || status === "Terminated") {
    const today = new Date().toISOString().slice(0, 10);
    if (deployment.endDate > today) deployment.endDate = today;
    db.shifts
      .filter((s) => s.deploymentId === deployment.id && s.date > today)
      .forEach((s) => (s.status = "Cancelled"));
  }

  recordActivity(db, {
    entity: "Deployment",
    entityId: deployment.id,
    hospitalId: deployment.hospitalId,
    type: "Deployment Status Changed",
    summary: `${deployment.deploymentCode} moved from ${before} to ${status}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "DEPLOYMENT_STATUS", "Deployments", deployment.id, `${user.name} set ${deployment.deploymentCode} to ${status}.`, { status: before }, { status });
  return ok(`${deployment.deploymentCode} is now ${status}.`);
}

export function requestReplacement(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const deployment = db.deployments.find((d) => d.id === str(payload, "id"));
  if (!deployment) return fail("Deployment was not found.", 404);
  if (deployment.replacementStatus === "Replaced") return fail("A replacement has already been recorded for this deployment.");

  deployment.replacementStatus = "Requested";
  const employee = db.employees.find((e) => e.id === deployment.employeeId);

  const requestNo = `SR-${new Date().getFullYear()}-${String(db.serviceRequests.length + 1).padStart(4, "0")}`;
  db.serviceRequests.unshift({
    id: `SR-DB-${Date.now().toString(36).toUpperCase()}`,
    requestNo,
    type: "Replacement Request",
    hospitalId: deployment.hospitalId,
    deploymentId: deployment.id,
    employeeId: deployment.employeeId,
    subject: `Replacement required for ${employee?.name ?? deployment.designation}`,
    description: str(payload, "reason") || "Replacement requested by the operations team.",
    priority: (str(payload, "priority") || "High") as ServiceRequest["priority"],
    status: "Open",
    raisedById: user.id,
    raisedByName: user.name,
    createdAt: new Date().toISOString(),
    slaHours: 72,
  });

  notify(db, {
    title: "Replacement requested",
    body: `${employee?.name ?? deployment.designation} at ${db.hospitals.find((h) => h.id === deployment.hospitalId)?.name} needs a replacement.`,
    type: "Approval",
    severity: "Critical",
    link: "/operations/replacements",
    audience: ["Super Admin", "Operations Manager", "Business Admin"],
  });
  recordAudit(db, user, "REPLACEMENT_REQUEST", "Deployments", deployment.id, `${user.name} requested a replacement for ${deployment.deploymentCode}.`);
  return ok(`Replacement request ${requestNo} raised.`);
}

export function requestShiftSwap(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const shift = db.shifts.find((s) => s.id === str(payload, "id"));
  if (!shift) return fail("Shift was not found.", 404);
  if (shift.status === "Swap Requested") return fail("A swap has already been requested for this shift.");
  const to = str(payload, "toEmployeeId");
  if (!to) return fail("Select the colleague who will cover this shift.", 400, { toEmployeeId: "Required" });
  if (to === shift.employeeId) return fail("A shift cannot be swapped with the same person.");

  const targetClash = db.shifts.find((s) => s.employeeId === to && s.date === shift.date);
  if (targetClash) return fail(`${db.employees.find((e) => e.id === to)?.name} already has a shift on ${shift.date}.`, 409);

  shift.status = "Swap Requested";
  shift.swapRequestFrom = shift.employeeId;
  shift.swapRequestTo = to;
  notify(db, {
    title: "Shift swap requested",
    body: `${db.employees.find((e) => e.id === shift.employeeId)?.name} requested ${db.employees.find((e) => e.id === to)?.name} cover the ${shift.type.toLowerCase()} shift on ${shift.date}.`,
    type: "Shift",
    severity: "Warning",
    link: "/workforce/shifts",
    audience: ["Super Admin", "Operations Manager", "HR Manager"],
  });
  recordAudit(db, user, "SHIFT_SWAP_REQUEST", "Shifts", shift.id, `${user.name} requested a shift swap for ${shift.id}.`);
  return ok("Shift swap request submitted for approval.");
}

export function resolveShiftSwap(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const shift = db.shifts.find((s) => s.id === str(payload, "id"));
  if (!shift) return fail("Shift was not found.", 404);
  if (shift.status !== "Swap Requested") return fail("There is no pending swap request on this shift.");
  const approve = payload.approve === true || payload.approve === "true";

  if (approve && shift.swapRequestTo) {
    const original = shift.employeeId;
    shift.employeeId = shift.swapRequestTo;
    shift.swapRequestFrom = original;
    shift.status = "Scheduled";
    shift.approvedBy = user.id;
  } else {
    shift.status = shift.date < new Date().toISOString().slice(0, 10) ? "Completed" : "Scheduled";
    shift.swapRequestTo = undefined;
  }
  recordAudit(db, user, "SHIFT_SWAP_DECIDE", "Shifts", shift.id, `${user.name} ${approve ? "approved" : "rejected"} the swap on ${shift.id}.`);
  return ok(approve ? "Swap approved and the roster updated." : "Swap rejected.");
}

export function updateServiceRequest(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const request = db.serviceRequests.find((s) => s.id === str(payload, "id"));
  if (!request) return fail("Service request was not found.", 404);
  const status = str(payload, "status");
  if (!["Open", "Acknowledged", "In Progress", "Resolved", "Rejected", "Closed"].includes(status)) {
    return fail(`"${status}" is not a valid service request status.`);
  }
  request.status = status as typeof request.status;
  if (status === "Resolved" || status === "Closed") {
    request.resolvedAt = new Date().toISOString();
    request.resolutionNote = str(payload, "resolutionNote") || "Resolved in the demo environment.";
  }
  recordActivity(db, {
    entity: "Service Request",
    entityId: request.id,
    hospitalId: request.hospitalId,
    type: "Service Request Updated",
    summary: `${request.requestNo} moved to ${status}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "SERVICE_REQUEST", "Service Requests", request.id, `${user.name} set ${request.requestNo} to ${status}.`);
  return ok(`${request.requestNo} is now ${status}.`);
}
