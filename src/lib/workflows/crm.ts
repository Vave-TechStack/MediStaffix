/** CRM workflows: lead stage movement, conversion, activity logging, contract renewal. */

import { notify, recordActivity, recordAudit } from "../store";
import { fail, ok, requireFields, str, type ActionResult } from "./types";
import type { Database, Hospital, Lead, User } from "../types";

const PROBABILITY: Record<string, number> = {
  New: 10,
  Contacted: 25,
  Qualified: 45,
  "Proposal Sent": 60,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
};

export function moveLead(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const lead = db.leads.find((l) => l.id === str(payload, "id"));
  if (!lead) return fail(`Lead ${str(payload, "id")} was not found.`, 404);
  const stage = str(payload, "stage");
  if (!(stage in PROBABILITY)) return fail(`"${stage}" is not a valid lead stage.`);

  const before = lead.stage;
  lead.stage = stage as Lead["stage"];
  lead.probability = PROBABILITY[stage];
  lead.updatedAt = new Date().toISOString();
  if (str(payload, "nextFollowUp")) lead.nextFollowUp = str(payload, "nextFollowUp");

  db.leadActivities.unshift({
    id: `LAC-${Date.now().toString(36).toUpperCase()}`,
    leadId: lead.id,
    type: "Note",
    summary: `Stage moved from ${before} to ${stage}`,
    details: str(payload, "note") || `Pipeline stage updated by ${user.name}.`,
    performedById: user.id,
    performedAt: new Date().toISOString(),
    simulated: true,
  });

  if (stage === "Negotiation" || stage === "Proposal Sent") {
    db.followUps.unshift({
      id: `FUP-${Date.now().toString(36).toUpperCase()}`,
      subject: `Follow up on ${lead.organization} — ${stage}`,
      relatedType: "Lead",
      relatedId: lead.id,
      dueAt: lead.nextFollowUp,
      ownerId: lead.assignedToId,
      priority: "High",
      notes: "Auto-created when the lead entered a late-stage pipeline state.",
      status: "Pending",
    });
  }

  recordActivity(db, {
    entity: "Lead",
    entityId: lead.id,
    type: "Lead Stage Changed",
    summary: `${lead.organization} moved from ${before} to ${stage}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "LEAD_STAGE", "Leads", lead.id, `${user.name} moved ${lead.organization} from ${before} to ${stage}.`, { stage: before }, { stage });
  return ok(`Lead moved to ${stage}.`, { lead });
}

export function convertLead(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const lead = db.leads.find((l) => l.id === str(payload, "id"));
  if (!lead) return fail(`Lead ${str(payload, "id")} was not found.`, 404);
  if (lead.convertedHospitalId) return fail("This lead has already been converted into a hospital account.");
  if (lead.stage !== "Won" && !payload.force) {
    return fail(`Move the lead to Won before converting it. ${lead.organization} is currently in ${lead.stage}.`);
  }

  const missing = requireFields(payload, ["beds", "type", "hrManager", "contactPerson", "email", "phone", "city", "state"]);
  if (missing) return fail(missing);

  const seq = db.hospitals.length + 1;
  const hospital: Hospital = {
    id: `HSP-${String(seq).padStart(3, "0")}`,
    name: str(payload, "name") || lead.organization,
    type: str(payload, "type") as Hospital["type"],
    registrationNo: str(payload, "registrationNo") || `HFR/${seq * 37 + 1000}/2026`,
    registrationAuthority: `${str(payload, "state")} Health Registration Authority (demo record)`,
    contactPerson: str(payload, "contactPerson"),
    hrManager: str(payload, "hrManager"),
    medicalSuperintendent: str(payload, "medicalSuperintendent") || "To be nominated",
    email: str(payload, "email"),
    phone: str(payload, "phone"),
    address: str(payload, "address") || `${lead.organization} campus`,
    city: str(payload, "city"),
    state: str(payload, "state"),
    pincode: str(payload, "pincode") || "560001",
    beds: Number(payload.beds) || 100,
    requiredCategories: (
      Array.isArray(payload.categories) && (payload.categories as string[]).length
        ? (payload.categories as string[])
        : lead.interestedCategories
    ) as Hospital["requiredCategories"],
    accountManagerId: lead.assignedToId,
    contractStatus: "Active",
    paymentTerms: (str(payload, "paymentTerms") || db.settings.defaultPaymentTerms) as Hospital["paymentTerms"],
    clientStatus: "Active",
    onboardedAt: new Date().toISOString().slice(0, 10),
    notes: `Converted from lead ${lead.id} (${lead.source}).`,
    archived: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  db.hospitals.unshift(hospital);
  db.hospitalContacts.unshift({
    id: `HCT-${hospital.id}-1`,
    hospitalId: hospital.id,
    name: hospital.contactPerson,
    designation: "Head of Human Resources",
    email: hospital.email,
    phone: hospital.phone,
    isPrimary: true,
  });

  lead.convertedHospitalId = hospital.id;
  lead.stage = "Won";
  lead.probability = 100;

  let contractId: string | undefined;
  if (payload.createContract) {
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    const cid = `CTR-${String(db.contracts.length + 1).padStart(3, "0")}`;
    db.contracts.unshift({
      id: cid,
      number: `MST-CTR-${start.getFullYear()}-${String(db.contracts.length + 1).padStart(4, "0")}`,
      title: `${hospital.name} — Clinical Staffing Services Agreement`,
      hospitalId: hospital.id,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      billingModel: "Per Doctor Per Month",
      categories: hospital.requiredCategories,
      replacementTerms: "Replacement doctor provided within 72 hours of written notice; no billing for uncovered shifts.",
      paymentTerms: hospital.paymentTerms,
      status: "Active",
      signedByHospital: hospital.contactPerson,
      signedByCompany: user.name,
      signedAt: start.toISOString().slice(0, 10),
      notes: "Auto-created during lead conversion. Fictional demo contract.",
      createdAt: start.toISOString().slice(0, 10),
    });
    contractId = cid;
  }

  db.opportunities.filter((o) => o.leadId === lead.id).forEach((o) => {
    o.stage = "Won";
    o.hospitalId = hospital.id;
  });

  notify(db, {
    title: "Lead converted to client",
    body: `${lead.organization} is now an active client (${hospital.id})${contractId ? " with contract " + contractId : ""}.`,
    type: "System",
    severity: "Success",
    link: `/crm/hospitals/${hospital.id}`,
    audience: ["Super Admin", "Business Admin", "Operations Manager", "Finance Manager"],
  });
  recordActivity(db, {
    entity: "Lead",
    entityId: lead.id,
    hospitalId: hospital.id,
    type: "Lead Converted",
    summary: `${lead.organization} converted into hospital account ${hospital.name}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "LEAD_CONVERT", "Leads", lead.id, `${user.name} converted ${lead.organization} into ${hospital.name} (${hospital.id}).`);

  return ok(`Converted into ${hospital.name}.`, { hospital, contractId });
}

export function logLeadActivity(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const lead = db.leads.find((l) => l.id === str(payload, "leadId"));
  if (!lead) return fail("Lead was not found.", 404);
  const type = str(payload, "type") as "Call" | "Email" | "Meeting" | "Note" | "Site Visit" | "Proposal";
  db.leadActivities.unshift({
    id: `LAC-${Date.now().toString(36).toUpperCase()}`,
    leadId: lead.id,
    type,
    summary: str(payload, "summary") || `${type} logged`,
    details: str(payload, "details") || "Simulated communication log. No message was dispatched.",
    performedById: user.id,
    performedAt: new Date().toISOString(),
    simulated: true,
  });
  recordAudit(db, user, "LEAD_ACTIVITY", "Leads", lead.id, `${user.name} logged a ${type.toLowerCase()} for ${lead.organization}.`);
  return ok(`${type} logged against ${lead.organization}.`);
}

export function completeFollowUp(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const f = db.followUps.find((x) => x.id === str(payload, "id"));
  if (!f) return fail("Follow-up was not found.", 404);
  if (f.status === "Completed") return fail("This follow-up is already completed.");
  f.status = "Completed";
  f.completedAt = new Date().toISOString().slice(0, 10);
  recordAudit(db, user, "FOLLOWUP_COMPLETE", "Follow-ups", f.id, `${user.name} completed follow-up "${f.subject}".`);
  return ok("Follow-up marked complete.");
}

export function renewContract(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const contract = db.contracts.find((c) => c.id === str(payload, "id"));
  if (!contract) return fail("Contract was not found.", 404);
  const months = Number(payload.months) || 12;
  const oldEnd = new Date(contract.endDate);
  const newEnd = new Date(oldEnd);
  newEnd.setMonth(newEnd.getMonth() + months);

  contract.endDate = newEnd.toISOString().slice(0, 10);
  contract.status = "Renewed";
  const hospital = db.hospitals.find((h) => h.id === contract.hospitalId);
  if (hospital) hospital.contractStatus = "Active";

  db.followUps.unshift({
    id: `FUP-${Date.now().toString(36).toUpperCase()}`,
    subject: `Confirm renewal paperwork for ${contract.number}`,
    relatedType: "Contract",
    relatedId: contract.id,
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    ownerId: user.id,
    priority: "High",
    notes: "Created automatically on renewal.",
    status: "Pending",
  });

  recordAudit(db, user, "CONTRACT_RENEW", "Contracts", contract.id, `${user.name} renewed ${contract.number} by ${months} months to ${contract.endDate}.`);
  return ok(`Contract renewed until ${contract.endDate}.`, { contract });
}
