/**
 * Recruitment workflows: pipeline movement, interviews, offers, and the
 * onboarding hand-off that creates the employee record.
 *
 * Identity handling: a candidate becomes an employee exactly once. `onboarding`
 * links the new employee to the originating candidate through
 * `employee.doctorProfile.candidateId`, so recruitment, HR, deployment and
 * payroll all reference the same person rather than creating duplicates.
 */

import { notify, recordActivity, recordAudit } from "../store";
import { fail, ok, str, type ActionResult } from "./types";
import type { Candidate, Database, Employee, User } from "../types";

const STAGE_ORDER = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Offer Released",
  "Joined",
];

export function moveApplication(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const app = db.applications.find((a) => a.id === str(payload, "id"));
  if (!app) return fail("Application was not found.", 404);
  const candidate = db.candidates.find((c) => c.id === app.candidateId);
  const stage = str(payload, "stage");

  if (stage !== "Rejected" && !STAGE_ORDER.includes(stage)) return fail(`"${stage}" is not a valid pipeline stage.`);

  const before = app.stage;
  app.stage = stage as typeof app.stage;
  app.updatedAt = new Date().toISOString();
  if (stage === "Rejected") {
    app.rejectedReason = str(payload, "reason") || "Rejected during pipeline review";
    if (candidate) candidate.status = "Rejected";
  } else {
    app.rejectedReason = undefined;
    if (candidate && candidate.status === "Rejected") candidate.status = "Active";
  }
  if (candidate) candidate.stage = stage as Candidate["stage"];

  if (stage === "Interview Scheduled" && str(payload, "scheduledAt")) {
    db.interviews.unshift({
      id: `INT-${Date.now().toString(36).toUpperCase()}`,
      applicationId: app.id,
      candidateId: app.candidateId,
      requisitionId: app.requisitionId,
      round: db.interviews.filter((i) => i.applicationId === app.id).length + 1,
      scheduledAt: str(payload, "scheduledAt"),
      mode: (str(payload, "mode") || "Video Call") as "In Person" | "Video Call" | "Phone" | "Panel",
      interviewers: String(payload.interviewers ?? user.name)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "Scheduled",
      result: "Pending",
      scorecard: [],
    });
    notify(db, {
      title: "Interview scheduled",
      body: `${candidate?.name ?? "Candidate"} — round ${db.interviews.filter((i) => i.applicationId === app.id).length}.`,
      type: "Recruitment",
      severity: "Info",
      link: "/recruitment/interviews",
      audience: ["Super Admin", "HR Manager", "Recruiter"],
    });
  }

  const job = db.requisitions.find((j) => j.id === app.requisitionId);
  if (job && stage === "Joined") {
    job.filled = Math.min(job.vacancies, job.filled + 1);
    job.status = job.filled >= job.vacancies ? "Filled" : "Partially Filled";
  }

  recordActivity(db, {
    entity: "Application",
    entityId: app.id,
    hospitalId: job?.hospitalId,
    type: "Pipeline Stage Changed",
    summary: `${candidate?.name ?? "Candidate"} moved from ${before} to ${stage}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "APPLICATION_STAGE", "Applications", app.id, `${user.name} moved application ${app.id} from ${before} to ${stage}.`, { stage: before }, { stage });
  return ok(`${candidate?.name ?? "Candidate"} moved to ${stage}.`, { stage });
}

export function setVerification(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const candidate = db.candidates.find((c) => c.id === str(payload, "id"));
  if (!candidate) return fail("Candidate was not found.", 404);
  const status = str(payload, "verificationStatus");
  candidate.verificationStatus = status as Candidate["verificationStatus"];
  candidate.updatedAt = new Date().toISOString();
  if (status === "Verified (Demo Record)") {
    candidate.documents = candidate.documents.map((d) => ({ ...d, status: "Accepted" as const }));
  }
  recordAudit(db, user, "CREDENTIAL_STATUS", "Candidates", candidate.id, `${user.name} set credential verification for ${candidate.name} to "${status}".`);
  return ok(`Verification status set to ${status}.`);
}

export function completeInterview(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const interview = db.interviews.find((i) => i.id === str(payload, "id"));
  if (!interview) return fail("Interview was not found.", 404);
  if (interview.status !== "Scheduled") return fail("Only a scheduled interview can be completed.");

  const result = str(payload, "result") || "Recommended";
  interview.status = "Completed";
  interview.result = result as typeof interview.result;
  interview.feedback = str(payload, "feedback") || `Panel recommendation: ${result}.`;

  const app = db.applications.find((a) => a.id === interview.applicationId);
  if (app) {
    const recommended = ["Recommended", "Strongly Recommended"].includes(result);
    app.stage = recommended ? "Interview Completed" : "Rejected";
    if (!recommended) app.rejectedReason = str(payload, "feedback") || "Not recommended by the interview panel.";
    app.updatedAt = new Date().toISOString();
    const candidate = db.candidates.find((c) => c.id === app.candidateId);
    if (candidate) {
      candidate.stage = app.stage;
      if (!recommended) candidate.status = "Rejected";
    }
  }
  recordAudit(db, user, "INTERVIEW_COMPLETE", "Interviews", interview.id, `${user.name} recorded "${result}" for interview ${interview.id}.`);
  return ok(`Interview recorded as ${result}.`, { result });
}

export function releaseOffer(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const offer = db.offers.find((o) => o.id === str(payload, "id"));
  if (!offer) return fail("Offer was not found.", 404);
  if (offer.status === "Accepted") return fail("This offer has already been accepted.");

  offer.status = "Released";
  offer.issuedAt = new Date().toISOString();

  const candidate = db.candidates.find((c) => c.id === offer.candidateId);
  const docId = `DOC-${Date.now().toString(36).toUpperCase()}`;
  db.documents.unshift({
    id: docId,
    name: `${offer.offerCode}_Offer_Letter.pdf`,
    category: "Offer Letter",
    ownerType: "Candidate",
    ownerId: offer.candidateId,
    fileName: `${offer.offerCode}.pdf`,
    mimeType: "application/pdf",
    sizeKb: 120,
    uploadedById: user.id,
    uploadedAt: new Date().toISOString(),
    status: "Active",
    accessRoles: ["Super Admin", "Business Admin", "HR Manager"],
    simulated: true,
  });
  offer.documentId = docId;

  const app = db.applications.find((a) => a.candidateId === offer.candidateId);
  if (app) {
    app.stage = "Offer Released";
    app.updatedAt = new Date().toISOString();
    if (candidate) candidate.stage = "Offer Released";
  }

  notify(db, {
    title: "Offer released",
    body: `${candidate?.name ?? "Candidate"} received offer ${offer.offerCode} (${offer.status}).`,
    type: "Recruitment",
    severity: "Info",
    link: "/recruitment/offers",
    audience: ["Super Admin", "HR Manager", "Recruiter", "Business Admin"],
  });
  recordAudit(db, user, "OFFER_RELEASE", "Offers", offer.id, `${user.name} released offer ${offer.offerCode} to ${candidate?.name}.`);
  return ok(`Offer ${offer.offerCode} released.`, { offer });
}

export function onboarding(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const offer = db.offers.find((o) => o.id === str(payload, "offerId"));
  if (!offer) return fail("Offer was not found.", 404);
  const candidate = db.candidates.find((c) => c.id === offer.candidateId);
  if (!candidate) return fail("The candidate for this offer no longer exists.", 404);

  const existing = db.employees.find((e) => e.doctorProfile?.candidateId === candidate.id);
  if (existing) return fail(`${candidate.name} is already on the payroll as ${existing.employeeCode}. Onboarding cannot be repeated.`, 409);

  if (offer.status !== "Accepted" && !payload.force) {
    return fail(`Mark offer ${offer.offerCode} as Accepted before onboarding, or confirm the override.`);
  }

  const seq = db.employees.length + 1;
  const employeeId = `EMP-${String(seq).padStart(4, "0")}`;
  const employeeCode = `MSX-DOC-${String(seq).padStart(4, "0")}`;
  const joiningDate = str(payload, "joiningDate") || offer.joiningDate;

  const employee: Employee = {
    id: employeeId,
    employeeCode,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.mobile,
    designation: db.requisitions.find((j) => j.id === offer.requisitionId)?.designation ?? "Resident Doctor",
    department: "Clinical Staffing",
    employmentType: "Full Time",
    dateOfJoining: joiningDate,
    reportingManagerId: db.users.find((u) => u.role === "Operations Manager")?.id,
    employmentStatus: "Active",
    salaryStructureId: `SAL-${String(seq).padStart(4, "0")}`,
    bankDetails: {
      accountHolder: candidate.name.replace(/^Dr\. /, ""),
      bankName: str(payload, "bankName") || "HDFC Bank",
      accountNumberMasked: `XXXXXX${String(Math.floor(1000 + Math.random() * 8999))}`,
      ifsc: str(payload, "ifsc") || "HDFC0000001",
      branch: str(payload, "branch") || "Bengaluru Main Branch",
    },
    emergencyContactName: str(payload, "emergencyContactName") || "To be updated",
    emergencyContactPhone: str(payload, "emergencyContactPhone") || candidate.mobile,
    city: candidate.preferredLocation.split(",")[0]?.trim(),
    state: candidate.stateCouncil.replace(/ State.*| Medical.*/i, "").trim(),
    archived: false,
    createdAt: new Date().toISOString(),
    doctorProfile: {
      candidateId: candidate.id,
      specialisation: candidate.specialization,
      categories: [db.requisitions.find((j) => j.id === offer.requisitionId)?.category ?? "Resident Doctor"],
      registrationCouncil: candidate.stateCouncil,
      registrationNumber: candidate.registrationNumber,
      experienceYears: candidate.experienceYears,
      skills: [],
      languages: ["English"],
      preferredShift: "General",
    },
  };
  db.employees.unshift(employee);

  const monthly = Math.round(offer.annualCtc / 12);
  db.salaryStructures.unshift({
    id: `SAL-${String(seq).padStart(4, "0")}`,
    employeeId,
    effectiveFrom: joiningDate,
    ctc: offer.annualCtc,
    basicPercent: 40,
    hraPercent: 20,
    specialAllowancePercent: 28,
    conveyancePercent: 12,
    professionalTaxEnabled: monthly > 15000,
    professionalTaxAmount: 200,
    providentFundEnabled: true,
    providentFundPercent: 12,
    esiEnabled: monthly <= 21000,
    esiPercent: 0.75,
    tdsApplicable: monthly >= 25000,
    tdsPercent: 0,
    revisionNote: `Created automatically on onboarding from offer ${offer.offerCode}.`,
    createdAt: new Date().toISOString(),
  });

  db.leaveBalances.push({
    employeeId,
    year: new Date(joiningDate).getFullYear(),
    casual: 12,
    sick: 12,
    earned: 15,
    unpaid: 0,
    compensatory: 0,
  });

  const app = db.applications.find((a) => a.candidateId === candidate.id);
  if (app) {
    app.stage = "Joined";
    app.updatedAt = new Date().toISOString();
  }
  candidate.stage = "Joined";
  candidate.status = "Placed";
  offer.status = "Accepted";
  offer.respondedAt = new Date().toISOString();

  const letterId = `DOC-${Date.now().toString(36).toUpperCase()}`;
  db.documents.unshift({
    id: letterId,
    name: `${employeeCode}_Appointment_Letter.pdf`,
    category: "Appointment Letter",
    ownerType: "Employee",
    ownerId: employeeId,
    fileName: `${employeeCode}_Appointment_Letter.pdf`,
    mimeType: "application/pdf",
    sizeKb: 110,
    uploadedById: user.id,
    uploadedAt: new Date().toISOString(),
    status: "Active",
    accessRoles: ["Super Admin", "Business Admin", "HR Manager"],
    simulated: true,
  });

  const job = db.requisitions.find((j) => j.id === offer.requisitionId);
  if (job) {
    job.filled = Math.min(job.vacancies, job.filled + 1);
    job.status = job.filled >= job.vacancies ? "Filled" : "Partially Filled";
  }

  notify(db, {
    title: "Onboarding complete",
    body: `${candidate.name} joined as ${employee.designation} (${employeeCode}) and is now available for deployment.`,
    type: "Recruitment",
    severity: "Success",
    link: `/workforce/deployment`,
    audience: ["Super Admin", "Business Admin", "HR Manager", "Operations Manager", "Payroll Manager"],
  });
  recordActivity(db, {
    entity: "Employee",
    entityId: employeeId,
    hospitalId: job?.hospitalId,
    type: "Onboarding Completed",
    summary: `${candidate.name} onboarded as ${employeeCode} from offer ${offer.offerCode}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "ONBOARD", "Employees", employeeId, `${user.name} onboarded ${candidate.name} as ${employeeCode}.`);

  return ok(`${candidate.name} is onboarded and ready for deployment.`, { employee, salaryStructureId: employee.salaryStructureId });
}
