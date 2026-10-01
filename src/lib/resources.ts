/**
 * Resource registry — the single declarative description of every CRUD module.
 *
 * Adding a module means adding one entry here plus a thin page that renders
 * `<ResourcePage resource="..." />`. Validation, permissions, filtering, sorting,
 * pagination, CSV export and audit logging are all derived from the definition,
 * so no module can ship with an unenforced field.
 */

import {
  ATTENDANCE_STATUSES,
  BILLING_MODELS,
  CANDIDATE_STATUSES,
  CONTRACT_STATUSES,
  DEPLOYMENT_STATUSES,
  DOCUMENT_CATEGORIES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  HOSPITAL_TYPES,
  INVOICE_STATUSES,
  INTERVIEW_MODES,
  INTERVIEW_RESULTS,
  LEAVE_STATUSES,
  LEAVE_TYPES,
  LEAD_SOURCES,
  OFFER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_TERMS,
  REQUISITION_PRIORITIES,
  REQUISITION_STATUSES,
  REQUIREMENT_STATUSES,
  SERVICE_REQUEST_PRIORITIES,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_TYPES,
  SHIFT_STATUSES,
  SHIFT_TYPES,
  STAFFING_CATEGORIES,
  VERIFICATION_STATUSES,
} from "./types";
import { optionList, type ColumnDef, type FieldDef, type FieldOption, type ResourceDef } from "./resource-types";
import type { Database, StaffingCategory } from "./types";

/** Candidate sourcing reuses the CRM lead-source vocabulary. */
const CANDIDATE_SOURCES = LEAD_SOURCES;
const CLIENT_STATUSES = ["Prospect", "Active", "On Hold", "Churned"] as const;
const LEAD_STAGE_OPTIONS = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"] as const;
const CANDIDATE_STAGE_OPTIONS = ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Interview Completed", "Selected", "Offer Released", "Joined", "Rejected"] as const;
const REPLACEMENT_STATUSES = ["Not Required", "Requested", "In Progress", "Replaced", "Cancelled"] as const;

const opts = <T extends string>(values: readonly T[]): FieldOption[] => values.map((v) => ({ value: v, label: v }));

const hospitalOptions = (db: Database) => optionList(db.hospitals.filter((h) => !h.archived), "name");
const employeeOptions = (db: Database) =>
  db.employees.filter((e) => e.doctorProfile && !e.archived).map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` }));
const userOptions = (db: Database) => optionList(db.users, "name");
/** Every employee, for payroll and HR screens that are not doctor-specific. */
const allEmployeeOptions = (db: Database) =>
  db.employees.filter((e) => !e.archived).map((e) => ({ value: e.id, label: `${e.name} (${e.employeeCode})` }));
const contractOptions = (db: Database) =>
  db.contracts.map((c) => ({ value: c.id, label: `${c.number} — ${db.hospitals.find((h) => h.id === c.hospitalId)?.name ?? ""}` }));
const categoryOptions: FieldOption[] = STAFFING_CATEGORIES.map((c) => ({ value: c, label: c }));

const money = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

export const RESOURCES: Record<string, ResourceDef> = {
  /* ----------------------------- CRM ----------------------------- */
  hospitals: {
    key: "hospitals",
    collection: "hospitals",
    label: "Hospital",
    labelPlural: "Hospitals",
    description: "Healthcare client records, contract state, contacts and staffing requirements.",
    view: "crm:hospitals:view",
    manage: "crm:hospitals:manage",
    fields: [
      { name: "name", label: "Hospital Name", type: "text", required: true, inTable: true, searchable: true, placeholder: "e.g. Aster Grand Medical Centre", span: 2 },
      { name: "type", label: "Hospital Type", type: "select", required: true, options: opts(HOSPITAL_TYPES), inTable: true },
      { name: "clientStatus", label: "Client Status", type: "select", required: true, options: opts(CLIENT_STATUSES), inTable: true },
      { name: "contractStatus", label: "Contract Status", type: "select", required: true, options: opts(CONTRACT_STATUSES), inTable: true },
      { name: "registrationNo", label: "Registration Number", type: "text", required: true, help: "Demo identifier only — not a real registration number." },
      { name: "registrationAuthority", label: "Registration Authority", type: "text", span: 2 },
      { name: "contactPerson", label: "Primary Contact", type: "text", required: true, inTable: true },
      { name: "hrManager", label: "HR Manager", type: "text", required: true, inTable: true },
      { name: "medicalSuperintendent", label: "Medical Superintendent", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true, inTable: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "address", label: "Address", type: "text", required: true, span: 2 },
      { name: "city", label: "City", type: "text", required: true, inTable: true },
      { name: "state", label: "State", type: "text", required: true, inTable: true },
      { name: "pincode", label: "Pincode", type: "text", required: true },
      { name: "beds", label: "Number of Beds", type: "number", required: true, min: 1, max: 5000, inTable: true },
      { name: "requiredCategories", label: "Required Doctor Categories", type: "multiselect", required: true, options: categoryOptions, span: 4, help: "Drives which staffing categories are offered when creating requirements." },
      { name: "accountManagerId", label: "Account Manager", type: "select", required: true, options: userOptions, inTable: true },
      { name: "paymentTerms", label: "Payment Terms", type: "select", required: true, options: opts(PAYMENT_TERMS) },
      { name: "onboardedAt", label: "Client Since", type: "date", required: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
      { name: "archived", label: "Archived", type: "switch", readOnly: true },
    ],
    columns: [
      { key: "name", label: "Hospital", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "beds", label: "Beds", type: "number", align: "right" },
      { key: "hrManager", label: "HR Manager", type: "text" },
      { key: "accountManagerId", label: "Account Manager", type: "text", value: (r, db) => db.users.find((u) => u.id === r.accountManagerId)?.name ?? "—" },
      { key: "contractStatus", label: "Contract", type: "badge" },
      { key: "clientStatus", label: "Client", type: "badge" },
    ],
    filters: [
      { field: "clientStatus", label: "Client Status", options: opts(CLIENT_STATUSES) },
      { field: "contractStatus", label: "Contract Status", options: opts(CONTRACT_STATUSES) },
      { field: "type", label: "Hospital Type", options: opts(HOSPITAL_TYPES) },
      { field: "state", label: "State", options: (db) => opts([...new Set(db.hospitals.map((h) => h.state))]) },
    ],
    searchFields: ["name", "city", "contactPerson", "hrManager", "registrationNo", "email"],
    titleField: "name",
    detailHref: (id) => `/crm/hospitals/${id}`,
    defaults: () => ({ archived: false, onboardedAt: new Date().toISOString().slice(0, 10) }),
    blockDelete: (r, db) => {
      if (db.deployments.some((d) => d.hospitalId === r.id && (d.status === "Active" || d.status === "Confirmed")))
        return "This hospital has active deployments. End or transfer those deployments before deleting.";
      if (db.invoices.some((i) => i.hospitalId === r.id)) return "Invoices exist for this hospital. Archive it instead of deleting.";
      return null;
    },
  },

  leads: {
    key: "leads",
    collection: "leads",
    label: "Lead",
    labelPlural: "Leads",
    description: "Prospect pipeline from first contact through conversion into a hospital account.",
    view: "crm:leads:view",
    manage: "crm:leads:manage",
    fields: [
      { name: "name", label: "Lead Name", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "organization", label: "Organization", type: "text", required: true, inTable: true },
      { name: "contactPerson", label: "Contact Person", type: "text", required: true, inTable: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "source", label: "Lead Source", type: "select", required: true, options: opts(LEAD_SOURCES), inTable: true },
      { name: "interestedCategories", label: "Interested Staffing Categories", type: "multiselect", required: true, options: categoryOptions, span: 2 },
      { name: "estimatedMonthlyValue", label: "Estimated Monthly Contract Value (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "stage", label: "Lead Status", type: "select", required: true, options: opts(LEAD_STAGE_OPTIONS), inTable: true },
      { name: "probability", label: "Win Probability (%)", type: "number", min: 0, max: 100 },
      { name: "assignedToId", label: "Assigned Sales Executive", type: "select", required: true, options: userOptions, inTable: true },
      { name: "nextFollowUp", label: "Next Follow-up", type: "date", required: true, inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "name", label: "Lead", type: "text" },
      { key: "organization", label: "Organization", type: "text" },
      { key: "contactPerson", label: "Contact", type: "text" },
      { key: "source", label: "Source", type: "badge" },
      { key: "stage", label: "Stage", type: "badge" },
      { key: "estimatedMonthlyValue", label: "Est. Monthly", type: "money", align: "right" },
      { key: "nextFollowUp", label: "Next Follow-up", type: "date" },
      { key: "assignedToId", label: "Owner", type: "text", value: (r, db) => db.users.find((u) => u.id === r.assignedToId)?.name ?? "—" },
    ],
    filters: [
      { field: "stage", label: "Stage", options: opts(LEAD_STAGE_OPTIONS) },
      { field: "source", label: "Source", options: opts(LEAD_SOURCES) },
      { field: "assignedToId", label: "Owner", options: userOptions },
    ],
    searchFields: ["name", "organization", "contactPerson", "email"],
    titleField: "name",
    defaults: () => ({ stage: "New", probability: 10, nextFollowUp: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }),
  },

  contacts: {
    key: "contacts",
    collection: "hospitalContacts",
    label: "Hospital Contact",
    labelPlural: "Hospital Contacts",
    description: "Named stakeholders inside each hospital — HR, medical superintendent and accounts.",
    view: "crm:hospitals:view",
    manage: "crm:hospitals:manage",
    fields: [
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "name", label: "Contact Name", type: "text", required: true, inTable: true, searchable: true },
      { name: "designation", label: "Designation", type: "text", required: true, inTable: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "isPrimary", label: "Primary Contact", type: "switch" },
    ],
    columns: [
      { key: "name", label: "Contact", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
    ],
    filters: [{ field: "hospitalId", label: "Hospital", options: hospitalOptions }],
    searchFields: ["name", "designation", "email"],
    titleField: "name",
    defaults: () => ({ isPrimary: false }),
  },

  opportunities: {
    key: "opportunities",
    collection: "opportunities",
    label: "Opportunity",
    labelPlural: "Opportunities",
    description: "Qualified pipeline opportunities with weighted value and expected close date.",
    view: "crm:leads:view",
    manage: "crm:leads:manage",
    fields: [
      { name: "name", label: "Opportunity Name", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "value", label: "Deal Value (₹/month)", type: "money", required: true, min: 0, inTable: true },
      { name: "headcount", label: "Headcount", type: "number", required: true, min: 1, inTable: true },
      { name: "probability", label: "Probability (%)", type: "number", min: 0, max: 100, inTable: true },
      { name: "stage", label: "Stage", type: "select", required: true, options: opts(LEAD_STAGE_OPTIONS), inTable: true },
      { name: "staffingCategories", label: "Staffing Categories", type: "multiselect", required: true, options: categoryOptions, span: 2 },
      { name: "expectedCloseDate", label: "Expected Close Date", type: "date", required: true, inTable: true },
      { name: "ownerId", label: "Owner", type: "select", required: true, options: userOptions },
    ],
    columns: [
      { key: "name", label: "Opportunity", type: "text" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "stage", label: "Stage", type: "badge" },
      { key: "value", label: "Value", type: "money", align: "right" },
      { key: "probability", label: "Prob.", type: "percent", align: "right" },
      { key: "expectedCloseDate", label: "Close Date", type: "date" },
      { key: "ownerId", label: "Owner", type: "text", value: (r, db) => db.users.find((u) => u.id === r.ownerId)?.name ?? "—" },
    ],
    filters: [
      { field: "stage", label: "Stage", options: opts(LEAD_STAGE_OPTIONS) },
      { field: "ownerId", label: "Owner", options: userOptions },
    ],
    searchFields: ["name"],
    titleField: "name",
    defaults: () => ({ stage: "Qualified", probability: 45 }),
  },

  followups: {
    key: "followups",
    collection: "followUps",
    label: "Follow-up",
    labelPlural: "Follow-ups",
    description: "Scheduled CRM and operational tasks with due dates, owners and priority.",
    view: "crm:leads:view",
    manage: "crm:leads:manage",
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "relatedType", label: "Related To", type: "select", required: true, options: opts(["Lead", "Hospital", "Candidate", "Contract", "Requisition", "Service Request"]), inTable: true },
      { name: "relatedId", label: "Related Record ID", type: "text", required: true, inTable: true, help: "Copy the record identifier from the module (e.g. LEAD-003)." },
      { name: "dueAt", label: "Due Date", type: "date", required: true, inTable: true },
      { name: "ownerId", label: "Owner", type: "select", required: true, options: userOptions, inTable: true },
      { name: "priority", label: "Priority", type: "select", required: true, options: opts(["Low", "Medium", "High"]), inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Pending", "Completed", "Overdue", "Cancelled"]), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "subject", label: "Subject", type: "text" },
      { key: "relatedType", label: "Related To", type: "text" },
      { key: "relatedId", label: "Record", type: "code" },
      { key: "dueAt", label: "Due", type: "date" },
      { key: "priority", label: "Priority", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
      { key: "ownerId", label: "Owner", type: "text", value: (r, db) => db.users.find((u) => u.id === r.ownerId)?.name ?? "—" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(["Pending", "Completed", "Overdue", "Cancelled"]) },
      { field: "priority", label: "Priority", options: opts(["Low", "Medium", "High"]) },
      { field: "ownerId", label: "Owner", options: userOptions },
    ],
    searchFields: ["subject", "relatedId", "notes"],
    titleField: "subject",
    defaults: () => ({ status: "Pending", priority: "Medium", dueAt: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) }),
  },

  contracts: {
    key: "contracts",
    collection: "contracts",
    label: "Contract",
    labelPlural: "Contracts",
    description: "Staffing services agreements, billing model, rates, and renewal tracking.",
    view: "crm:contracts:view",
    manage: "crm:contracts:manage",
    fields: [
      { name: "number", label: "Contract Number", type: "text", required: true, inTable: true },
      { name: "title", label: "Contract Title", type: "text", required: true, inTable: true, span: 2 },
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "status", label: "Contract Status", type: "select", required: true, options: opts(CONTRACT_STATUSES), inTable: true },
      { name: "startDate", label: "Start Date", type: "date", required: true, inTable: true },
      { name: "endDate", label: "End Date", type: "date", required: true, inTable: true },
      { name: "billingModel", label: "Billing Model", type: "select", required: true, options: opts(BILLING_MODELS) },
      { name: "paymentTerms", label: "Payment Terms", type: "select", required: true, options: opts(PAYMENT_TERMS) },
      { name: "categories", label: "Agreed Staffing Categories", type: "multiselect", required: true, options: categoryOptions, span: 2 },
      { name: "replacementTerms", label: "Replacement Terms", type: "textarea", required: true, span: 4 },
      { name: "signedByHospital", label: "Signed By (Hospital)", type: "text", required: true },
      { name: "signedByCompany", label: "Signed By (Company)", type: "text", required: true },
      { name: "signedAt", label: "Signed On", type: "date" },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "number", label: "Contract No.", type: "code" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "startDate", label: "Start", type: "date" },
      { key: "endDate", label: "End", type: "date" },
      { key: "billingModel", label: "Billing", type: "text" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(CONTRACT_STATUSES) },
      { field: "hospitalId", label: "Hospital", options: hospitalOptions },
      { field: "billingModel", label: "Billing Model", options: opts(BILLING_MODELS) },
    ],
    searchFields: ["number", "title"],
    titleField: "number",
    defaults: (db) => ({
      status: "Draft",
      paymentTerms: db.settings.defaultPaymentTerms,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    }),
    refine: (v) => (v.startDate && v.endDate && v.endDate < v.startDate ? "End date must be after the start date." : null),
    afterCreate: (rec, db, _user) => {
      const h = db.hospitals.find((x) => x.id === rec.hospitalId);
      if (h && h.clientStatus === "Prospect") h.clientStatus = "Active";
    },
  },

  /* -------------------------- Recruitment ------------------------- */
  candidates: {
    key: "candidates",
    collection: "candidates",
    label: "Candidate",
    labelPlural: "Candidates",
    description: "Medical professional talent pool with credential verification tracking.",
    view: "recruitment:candidates:view",
    manage: "recruitment:candidates:manage",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      { name: "email", label: "Email", type: "email", required: true, inTable: true },
      { name: "qualification", label: "Medical Qualification", type: "text", required: true, inTable: true, placeholder: "e.g. MBBS, MD" },
      { name: "specialization", label: "Specialization", type: "text", required: true, inTable: true },
      { name: "registrationNumber", label: "Medical Registration Number", type: "text", required: true, help: "Demo placeholder. Never enter a real registration number in a demo environment." },
      { name: "stateCouncil", label: "State Medical Council", type: "text", required: true },
      { name: "experienceYears", label: "Experience (years)", type: "number", required: true, min: 0, max: 50, inTable: true },
      { name: "expectedSalary", label: "Expected Monthly Salary (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "availability", label: "Availability", type: "select", required: true, options: opts(["Immediate", "15 days", "30 days", "45 days", "60 days"]), inTable: true },
      { name: "preferredLocation", label: "Preferred Location", type: "text", required: true },
      { name: "currentLocation", label: "Current Location", type: "text", required: true },
      { name: "stage", label: "Pipeline Stage", type: "select", required: true, options: opts(CANDIDATE_STAGE_OPTIONS), inTable: true },
      { name: "status", label: "Candidate Status", type: "select", required: true, options: opts(CANDIDATE_STATUSES), inTable: true },
      { name: "verificationStatus", label: "Credential Verification", type: "select", required: true, options: opts(VERIFICATION_STATUSES), inTable: true, help: "Demo workflow state only. Not a real credential verification." },
      { name: "source", label: "Source", type: "select", required: true, options: opts(CANDIDATE_SOURCES) },
      { name: "referredBy", label: "Referred By", type: "text" },
      { name: "noticePeriodDays", label: "Notice Period (days)", type: "number", min: 0, max: 180 },
      { name: "summary", label: "Profile Summary", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "name", label: "Candidate", type: "text" },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "experienceYears", label: "Exp (yrs)", type: "number", align: "right" },
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "stage", label: "Stage", type: "badge" },
      { key: "verificationStatus", label: "Verification", type: "badge" },
      { key: "expectedSalary", label: "Expected", type: "money", align: "right" },
      { key: "availability", label: "Availability", type: "text" },
    ],
    filters: [
      { field: "stage", label: "Stage", options: opts(CANDIDATE_STAGE_OPTIONS) },
      { field: "status", label: "Status", options: opts(CANDIDATE_STATUSES) },
      { field: "verificationStatus", label: "Verification", options: opts(VERIFICATION_STATUSES) },
      { field: "source", label: "Source", options: opts(CANDIDATE_SOURCES) },
      { field: "specialization", label: "Specialization", options: (db) => opts([...new Set(db.candidates.map((c) => c.specialization))]) },
    ],
    searchFields: ["name", "specialization", "qualification", "email", "stateCouncil"],
    titleField: "name",
    defaults: () => ({
      stage: "Applied",
      status: "Active",
      verificationStatus: "Not Initiated",
      source: "Referral",
      availability: "30 days",
      noticePeriodDays: 30,
      rating: 4,
    }),
    prepare: (values, db, _user) => {
      const n = db.candidates.length + 1;
      return {
        ...values,
        candidateCode: `CAND-${String(n).padStart(4, "0")}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: [],
      };
    },
  },

  requisitions: {
    key: "requisitions",
    collection: "requisitions",
    label: "Job Requisition",
    labelPlural: "Job Requisitions",
    description: "Hospital-approved openings that drive the recruitment pipeline.",
    view: "recruitment:requisitions:view",
    manage: "recruitment:requisitions:manage",
    fields: [
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "designation", label: "Required Designation", type: "text", required: true, inTable: true, searchable: true },
      { name: "category", label: "Staffing Category", type: "select", required: true, options: categoryOptions, inTable: true },
      { name: "qualification", label: "Qualification", type: "text", required: true },
      { name: "specialization", label: "Specialization", type: "text", required: true },
      { name: "vacancies", label: "Number of Vacancies", type: "number", required: true, min: 1, inTable: true },
      { name: "filled", label: "Filled", type: "number", min: 0, inTable: true },
      { name: "salaryBudget", label: "Monthly Salary Budget (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "workLocation", label: "Work Location", type: "text", required: true, inTable: true },
      { name: "shiftRequirement", label: "Shift Requirement", type: "text", required: true },
      { name: "contractDuration", label: "Contract Duration", type: "text", required: true },
      { name: "joiningDeadline", label: "Joining Deadline", type: "date", required: true, inTable: true },
      { name: "priority", label: "Priority", type: "select", required: true, options: opts(REQUISITION_PRIORITIES), inTable: true },
      { name: "status", label: "Job Status", type: "select", required: true, options: opts(REQUISITION_STATUSES), inTable: true },
      { name: "recruiterId", label: "Assigned Recruiter", type: "select", required: true, options: userOptions, inTable: true },
    ],
    columns: [
      { key: "jobCode", label: "Job ID", type: "code" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "vacancies", label: "Openings", type: "number", align: "right" },
      { key: "salaryBudget", label: "Budget", type: "money", align: "right" },
      { key: "priority", label: "Priority", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
      { key: "joiningDeadline", label: "Deadline", type: "date" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(REQUISITION_STATUSES) },
      { field: "priority", label: "Priority", options: opts(REQUISITION_PRIORITIES) },
      { field: "hospitalId", label: "Hospital", options: hospitalOptions },
      { field: "category", label: "Category", options: categoryOptions },
    ],
    searchFields: ["jobCode", "designation", "specialization", "workLocation"],
    titleField: "designation",
    defaults: (db) => {
      const n = db.requisitions.length + 1;
      return {
        jobCode: `JOB-${String(n).padStart(4, "0")}`,
        filled: 0,
        status: "Open",
        priority: "Medium",
        contractDuration: "12 months",
        joiningDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
    },
  },

  applications: {
    key: "applications",
    collection: "applications",
    label: "Application",
    labelPlural: "Applications",
    description: "Candidate-to-requisition applications tracked through the hiring pipeline.",
    view: "recruitment:candidates:view",
    manage: "recruitment:candidates:manage",
    fields: [
      { name: "candidateId", label: "Candidate", type: "select", required: true, options: (db) => optionList(db.candidates, "name"), inTable: true },
      { name: "requisitionId", label: "Job Requisition", type: "select", required: true, options: (db) => db.requisitions.map((r) => ({ value: r.id, label: `${r.jobCode} — ${r.designation}` })), inTable: true },
      { name: "stage", label: "Pipeline Stage", type: "select", required: true, options: opts(CANDIDATE_STAGE_OPTIONS), inTable: true },
      { name: "source", label: "Source", type: "select", required: true, options: opts(CANDIDATE_SOURCES), inTable: true },
      { name: "hospitalFitScore", label: "Hospital Fit Score (0-100)", type: "number", required: true, min: 0, max: 100, inTable: true },
      { name: "recruiterNotes", label: "Recruiter Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "candidateId", label: "Candidate", type: "text", value: (r, db) => db.candidates.find((c) => c.id === r.candidateId)?.name ?? "—" },
      { key: "requisitionId", label: "Requisition", type: "text", value: (r, db) => db.requisitions.find((x) => x.id === r.requisitionId)?.jobCode ?? "—" },
      { key: "stage", label: "Stage", type: "badge" },
      { key: "source", label: "Source", type: "text" },
      { key: "hospitalFitScore", label: "Fit Score", type: "number", align: "right" },
      { key: "appliedAt", label: "Applied", type: "date" },
    ],
    filters: [
      { field: "stage", label: "Stage", options: opts(CANDIDATE_STAGE_OPTIONS) },
      { field: "source", label: "Source", options: opts(CANDIDATE_SOURCES) },
    ],
    searchFields: [],
    titleField: "candidateId",
    defaults: () => ({
      stage: "Applied",
      source: "Referral",
      hospitalFitScore: 70,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  },

  interviews: {
    key: "interviews",
    collection: "interviews",
    label: "Interview",
    labelPlural: "Interviews",
    description: "Interview scheduling, panel feedback and selection outcomes.",
    view: "recruitment:interviews:view",
    manage: "recruitment:interviews:manage",
    fields: [
      { name: "candidateId", label: "Candidate", type: "select", required: true, options: (db) => optionList(db.candidates, "name"), inTable: true },
      { name: "requisitionId", label: "Requisition", type: "select", required: true, options: (db) => db.requisitions.map((r) => ({ value: r.id, label: r.jobCode })) },
      { name: "round", label: "Round", type: "number", required: true, min: 1, max: 6, inTable: true },
      { name: "scheduledAt", label: "Scheduled At", type: "datetime", required: true, inTable: true },
      { name: "mode", label: "Interview Mode", type: "select", required: true, options: opts(INTERVIEW_MODES), inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Scheduled", "Completed", "Rescheduled", "Cancelled", "No Show"]), inTable: true },
      { name: "result", label: "Result", type: "select", required: true, options: opts(INTERVIEW_RESULTS), inTable: true },
      { name: "interviewers", label: "Interview Panel", type: "text", required: true, span: 2, help: "Comma separated panel member names." },
      { name: "feedback", label: "Feedback", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "candidateId", label: "Candidate", type: "text", value: (r, db) => db.candidates.find((c) => c.id === r.candidateId)?.name ?? "—" },
      { key: "round", label: "Round", type: "number", align: "right" },
      { key: "scheduledAt", label: "Scheduled", type: "datetime" },
      { key: "mode", label: "Mode", type: "text" },
      { key: "status", label: "Status", type: "badge" },
      { key: "result", label: "Result", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(["Scheduled", "Completed", "Rescheduled", "Cancelled", "No Show"]) },
      { field: "result", label: "Result", options: opts(INTERVIEW_RESULTS) },
      { field: "mode", label: "Mode", options: opts(INTERVIEW_MODES) },
    ],
    searchFields: [],
    titleField: "candidateId",
    defaults: (db) => {
      const a = db.applications[db.applications.length - 1];
      return {
        round: 1,
        status: "Scheduled",
        result: "Pending",
        mode: "Video Call",
        interviewers: "Panel Member 1, Panel Member 2",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        applicationId: a?.id ?? "",
        requisitionId: a?.requisitionId ?? db.requisitions[0]?.id ?? "",
        scorecard: [],
      };
    },
    prepare: (values, db) => {
      const app = db.applications.find((a) => a.candidateId === values.candidateId);
      return { ...values, interviewers: String(values.interviewers ?? "").split(",").map((s) => s.trim()).filter(Boolean), applicationId: app?.id ?? "" };
    },
  },

  offers: {
    key: "offers",
    collection: "offers",
    label: "Offer",
    labelPlural: "Offers",
    description: "Offer letters, CTC breakdowns, acceptance tracking and joining dates.",
    view: "recruitment:offers:view",
    manage: "recruitment:offers:manage",
    fields: [
      { name: "candidateId", label: "Candidate", type: "select", required: true, options: (db) => optionList(db.candidates, "name"), inTable: true },
      { name: "requisitionId", label: "Requisition", type: "select", required: true, options: (db) => db.requisitions.map((r) => ({ value: r.id, label: r.jobCode })) },
      { name: "annualCtc", label: "Annual CTC (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "fixedSalary", label: "Fixed Salary (₹/month)", type: "money", required: true, min: 0, inTable: true },
      { name: "variablePay", label: "Variable Pay (₹/month)", type: "money", required: true, min: 0 },
      { name: "joiningDate", label: "Joining Date", type: "date", required: true, inTable: true },
      { name: "expiresAt", label: "Offer Valid Until", type: "date", required: true, inTable: true },
      { name: "status", label: "Offer Status", type: "select", required: true, options: opts(OFFER_STATUSES), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "offerCode", label: "Offer No.", type: "code" },
      { key: "candidateId", label: "Candidate", type: "text", value: (r, db) => db.candidates.find((c) => c.id === r.candidateId)?.name ?? "—" },
      { key: "annualCtc", label: "Annual CTC", type: "money", align: "right" },
      { key: "joiningDate", label: "Joining Date", type: "date" },
      { key: "expiresAt", label: "Valid Until", type: "date" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(OFFER_STATUSES) },
    ],
    searchFields: ["offerCode"],
    titleField: "offerCode",
    defaults: (db) => {
      const n = db.offers.length + 1;
      return {
        offerCode: `OFR-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`,
        status: "Draft",
        issuedAt: new Date().toISOString(),
        joiningDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      };
    },
    prepare: (values, db) => {
      const app = db.applications.find((a) => a.candidateId === values.candidateId);
      return { ...values, applicationId: app?.id ?? "" };
    },
  },

  /* --------------------------- Workforce ------------------------- */
  employees: {
    key: "employees",
    collection: "employees",
    label: "Employee",
    labelPlural: "Employees",
    description: "Company and deployed workforce records including clinicians and internal staff.",
    view: "hrm:employees:view",
    manage: "hrm:employees:manage",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "designation", label: "Designation", type: "text", required: true, inTable: true },
      { name: "department", label: "Department", type: "text", required: true, inTable: true },
      { name: "employmentType", label: "Employment Type", type: "select", required: true, options: opts(EMPLOYMENT_TYPES), inTable: true },
      { name: "email", label: "Email", type: "email", required: true, inTable: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "dateOfJoining", label: "Date of Joining", type: "date", required: true, inTable: true },
      { name: "reportingManagerId", label: "Reporting Manager", type: "select", options: userOptions },
      { name: "employmentStatus", label: "Employment Status", type: "select", required: true, options: opts(EMPLOYMENT_STATUSES), inTable: true },
      { name: "emergencyContactName", label: "Emergency Contact", type: "text" },
      { name: "emergencyContactPhone", label: "Emergency Contact Phone", type: "tel" },
      { name: "address", label: "Address", type: "text", span: 2 },
      { name: "city", label: "City", type: "text", inTable: true },
      { name: "state", label: "State", type: "text", inTable: true },
      { name: "archived", label: "Archived", type: "switch", readOnly: true },
    ],
    columns: [
      { key: "employeeCode", label: "Employee ID", type: "code" },
      { key: "name", label: "Name", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "employmentType", label: "Type", type: "badge" },
      { key: "dateOfJoining", label: "Joined", type: "date" },
      { key: "city", label: "City", type: "text" },
      { key: "employmentStatus", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "employmentStatus", label: "Status", options: opts(EMPLOYMENT_STATUSES) },
      { field: "employmentType", label: "Employment Type", options: opts(EMPLOYMENT_TYPES) },
      { field: "department", label: "Department", options: (db) => opts([...new Set(db.employees.map((e) => e.department))]) },
    ],
    searchFields: ["name", "employeeCode", "designation", "email", "city"],
    titleField: "name",
    portalScope: "employee",
    defaults: (db) => {
      const n = db.employees.length + 1;
      return {
        employeeCode: `MSX-EMP-${String(n).padStart(4, "0")}`,
        employmentStatus: "Active",
        employmentType: "Full Time",
        archived: false,
        dateOfJoining: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
    },
    blockDelete: (r, db) =>
      db.deployments.some((d) => d.employeeId === r.id && (d.status === "Active" || d.status === "Confirmed"))
        ? "This employee has an active deployment. Complete or terminate the deployment first."
        : null,
  },

  salaryStructures: {
    key: "salary-structures",
    collection: "salaryStructures",
    label: "Salary Structure",
    labelPlural: "Salary Structures",
    description: "Component-wise salary breakup. Statutory percentages are configurable per structure.",
    view: "payroll:view",
    manage: "payroll:process",
    fields: [
      { name: "employeeId", label: "Employee", type: "select", required: true, options: (db) => db.employees.map((e) => ({ value: e.id, label: `${e.name} — ${e.designation}` })), inTable: true },
      { name: "ctc", label: "Annual CTC (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "effectiveFrom", label: "Effective From", type: "date", required: true, inTable: true },
      { name: "basicPercent", label: "Basic %", type: "number", required: true, min: 0, max: 100, inTable: true },
      { name: "hraPercent", label: "HRA %", type: "number", required: true, min: 0, max: 100 },
      { name: "specialAllowancePercent", label: "Special Allowance %", type: "number", required: true, min: 0, max: 100 },
      { name: "conveyancePercent", label: "Conveyance %", type: "number", required: true, min: 0, max: 100 },
      { name: "professionalTaxEnabled", label: "Professional Tax Applicable", type: "switch" },
      { name: "professionalTaxAmount", label: "Professional Tax (₹/month)", type: "money", min: 0 },
      { name: "providentFundEnabled", label: "Provident Fund Applicable", type: "switch" },
      { name: "providentFundPercent", label: "Provident Fund %", type: "number", min: 0, max: 20 },
      { name: "esiEnabled", label: "ESI Applicable", type: "switch" },
      { name: "esiPercent", label: "ESI %", type: "number", min: 0, max: 5 },
      { name: "tdsApplicable", label: "TDS Applicable", type: "switch" },
      { name: "tdsPercent", label: "TDS %", type: "number", min: 0, max: 60 },
      { name: "revisionNote", label: "Revision Note", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "employeeId", label: "Employee", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "ctc", label: "Annual CTC", type: "money", align: "right" },
      { key: "effectiveFrom", label: "Effective From", type: "date" },
      { key: "basicPercent", label: "Basic %", type: "number", align: "right" },
      { key: "providentFundPercent", label: "PF %", type: "number", align: "right" },
      { key: "tdsPercent", label: "TDS %", type: "number", align: "right" },
    ],
    filters: [{ field: "effectiveFrom", label: "Effective From" }],
    searchFields: [],
    titleField: "employeeId",
    defaults: (db) => ({
      effectiveFrom: new Date().toISOString().slice(0, 10),
      basicPercent: 40,
      hraPercent: 20,
      specialAllowancePercent: 28,
      conveyancePercent: 12,
      professionalTaxEnabled: true,
      professionalTaxAmount: 200,
      providentFundEnabled: true,
      providentFundPercent: 12,
      esiEnabled: false,
      esiPercent: 0.75,
      tdsApplicable: false,
      tdsPercent: 0,
      createdAt: new Date().toISOString(),
      revisionNote: "Structure created.",
      _unused: db.users.length,
    }),
  },

  deployments: {
    key: "deployments",
    collection: "deployments",
    label: "Deployment",
    labelPlural: "Deployments",
    description: "Doctor-to-hospital allocations, contractual billing rates and replacement state.",
    view: "workforce:deployments:view",
    manage: "workforce:deployments:manage",
    fields: [
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "employeeId", label: "Doctor / Staff", type: "select", required: true, options: employeeOptions, inTable: true },
      { name: "designation", label: "Designation", type: "text", required: true, inTable: true },
      { name: "contractId", label: "Contract", type: "select", required: true, options: contractOptions, inTable: true },
      { name: "startDate", label: "Start Date", type: "date", required: true, inTable: true },
      { name: "endDate", label: "End Date", type: "date", required: true, inTable: true },
      { name: "shift", label: "Shift", type: "select", required: true, options: opts(SHIFT_TYPES), inTable: true },
      { name: "monthlySalary", label: "Monthly Salary to Doctor (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "monthlyHospitalBilling", label: "Monthly Hospital Billing (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "status", label: "Deployment Status", type: "select", required: true, options: opts(DEPLOYMENT_STATUSES), inTable: true },
      { name: "replacementStatus", label: "Replacement Status", type: "select", required: true, options: opts(REPLACEMENT_STATUSES), inTable: true },
      { name: "reportingContact", label: "Reporting Contact", type: "text", required: true },
      { name: "reportingContactPhone", label: "Reporting Contact Phone", type: "tel", required: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "deploymentCode", label: "Deployment ID", type: "code" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "employeeId", label: "Staff", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "shift", label: "Shift", type: "badge" },
      { key: "monthlySalary", label: "Doctor Cost", type: "money", align: "right" },
      { key: "monthlyHospitalBilling", label: "Billed", type: "money", align: "right" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(DEPLOYMENT_STATUSES) },
      { field: "shift", label: "Shift", options: opts(SHIFT_TYPES) },
      { field: "hospitalId", label: "Hospital", options: hospitalOptions },
      { field: "replacementStatus", label: "Replacement", options: opts(REPLACEMENT_STATUSES) },
    ],
    searchFields: ["deploymentCode", "designation"],
    titleField: "deploymentCode",
    portalScope: "hospital",
    defaults: (db) => {
      const n = db.deployments.length + 1;
      return {
        deploymentCode: `MSX-DEP-${String(n).padStart(4, "0")}`,
        status: "Proposed",
        replacementStatus: "Not Required",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
    },
    refine: (values, db) => {
      if (!values.startDate || !values.endDate || values.endDate < values.startDate)
        return "End date must be after the start date.";
      if (["Active", "Confirmed"].includes(String(values.status)) && values.employeeId) {
        const conflict = db.deployments.find(
          (d) =>
            d.employeeId === values.employeeId &&
            ["Active", "Confirmed"].includes(d.status) &&
            d.id !== values.id &&
            d.startDate <= String(values.endDate) &&
            d.endDate >= String(values.startDate)
        );
        if (conflict)
          return `Overlap blocked: this person already has a ${conflict.status.toLowerCase()} deployment (${conflict.deploymentCode}) from ${conflict.startDate} to ${conflict.endDate}. A doctor can hold multiple historical deployments but only one active full-time assignment.`;
      }
      return null;
    },
    blockDelete: (r, db) =>
      db.payrollItems.some((p) => p.deploymentId === r.id) || db.invoices.some((i) => i.items.some((it) => it.deploymentId === r.id))
        ? "This deployment has payroll or invoice history and cannot be deleted. End it instead."
        : null,
  },

  shifts: {
    key: "shifts",
    collection: "shifts",
    label: "Shift",
    labelPlural: "Shifts",
    description: "Shift-level rosters that drive attendance, payroll and hospital billing.",
    view: "hrm:shifts:view",
    manage: "hrm:shifts:manage",
    fields: [
      { name: "deploymentId", label: "Deployment", type: "select", required: true, options: (db) => db.deployments.filter((d) => d.status === "Active" || d.status === "Confirmed").map((d) => ({ value: d.id, label: `${d.deploymentCode} — ${db.employees.find((e) => e.id === d.employeeId)?.name ?? ""}` })), inTable: true },
      { name: "date", label: "Date", type: "date", required: true, inTable: true },
      { name: "type", label: "Shift Type", type: "select", required: true, options: opts(SHIFT_TYPES), inTable: true },
      { name: "startTime", label: "Start Time", type: "text", required: true, placeholder: "08:00", inTable: true },
      { name: "endTime", label: "End Time", type: "text", required: true, placeholder: "16:00", inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(SHIFT_STATUSES), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "type", label: "Shift", type: "badge" },
      { key: "startTime", label: "From", type: "text" },
      { key: "endTime", label: "To", type: "text" },
      { key: "deploymentId", label: "Staff", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "type", label: "Shift Type", options: opts(SHIFT_TYPES) },
      { field: "status", label: "Status", options: opts(SHIFT_STATUSES) },
      { field: "date", label: "Date" },
    ],
    searchFields: [],
    titleField: "date",
    portalScope: "employee",
    defaults: () => ({ type: "Day", startTime: "08:00", endTime: "16:00", status: "Scheduled", notes: "" }),
    prepare: (values, db) => {
      const dep = db.deployments.find((d) => d.id === values.deploymentId);
      return { ...values, hospitalId: dep?.hospitalId ?? "", employeeId: dep?.employeeId ?? "" };
    },
  },

  attendance: {
    key: "attendance",
    collection: "attendance",
    label: "Attendance Record",
    labelPlural: "Attendance",
    description: "Daily attendance, late arrivals, overtime and correction approvals.",
    view: "hrm:attendance:view",
    manage: "hrm:attendance:manage",
    fields: [
      { name: "date", label: "Date", type: "date", required: true, inTable: true },
      { name: "employeeId", label: "Employee", type: "select", required: true, options: employeeOptions, inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(ATTENDANCE_STATUSES), inTable: true },
      { name: "checkIn", label: "Check In", type: "text", placeholder: "08:02" },
      { name: "checkOut", label: "Check Out", type: "text", placeholder: "16:05" },
      { name: "workedHours", label: "Worked Hours", type: "number", min: 0, max: 24, step: 0.5, inTable: true },
      { name: "overtimeHours", label: "Overtime Hours", type: "number", min: 0, max: 12, step: 0.5, inTable: true },
      { name: "lateMinutes", label: "Late (minutes)", type: "number", min: 0, max: 600 },
      { name: "correctionRequested", label: "Correction Requested", type: "switch", inTable: true },
      { name: "correctionReason", label: "Correction Reason", type: "textarea", span: 4 },
      { name: "remarks", label: "Remarks", type: "textarea", span: 2 },
    ],
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "employeeId", label: "Employee", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "status", label: "Status", type: "badge" },
      { key: "checkIn", label: "In", type: "text" },
      { key: "checkOut", label: "Out", type: "text" },
      { key: "workedHours", label: "Hours", type: "number", align: "right" },
      { key: "overtimeHours", label: "OT", type: "number", align: "right" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(ATTENDANCE_STATUSES) },
      { field: "date", label: "Date" },
    ],
    searchFields: [],
    titleField: "employeeId",
    portalScope: "employee",
    defaults: () => ({ date: new Date().toISOString().slice(0, 10), status: "Present", workedHours: 8, overtimeHours: 0, lateMinutes: 0, correctionRequested: false, remarks: "" }),
    prepare: (values, db) => {
      const shift = db.shifts.find((s) => s.employeeId === values.employeeId && s.date === values.date);
      const dep = shift ? db.deployments.find((d) => d.id === shift.deploymentId) : db.deployments.find((d) => d.employeeId === values.employeeId && d.status === "Active");
      return { ...values, shiftId: shift?.id, deploymentId: dep?.id, hospitalId: dep?.hospitalId };
    },
  },

  leaveRequests: {
    key: "leave-requests",
    collection: "leaveRequests",
    label: "Leave Request",
    labelPlural: "Leave Requests",
    description: "Leave applications, manager decisions and balance tracking.",
    view: "hrm:leave:view",
    manage: "hrm:leave:manage",
    fields: [
      { name: "employeeId", label: "Employee", type: "select", required: true, options: (db) => db.employees.map((e) => ({ value: e.id, label: e.name })), inTable: true },
      { name: "type", label: "Leave Type", type: "select", required: true, options: opts(LEAVE_TYPES), inTable: true },
      { name: "fromDate", label: "From Date", type: "date", required: true, inTable: true },
      { name: "toDate", label: "To Date", type: "date", required: true, inTable: true },
      { name: "days", label: "Days", type: "number", required: true, min: 0.5, inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(LEAVE_STATUSES), inTable: true },
      { name: "reason", label: "Reason", type: "textarea", required: true, span: 4 },
    ],
    columns: [
      { key: "employeeId", label: "Employee", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "type", label: "Type", type: "text" },
      { key: "fromDate", label: "From", type: "date" },
      { key: "toDate", label: "To", type: "date" },
      { key: "days", label: "Days", type: "number", align: "right" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(LEAVE_STATUSES) },
      { field: "type", label: "Leave Type", options: opts(LEAVE_TYPES) },
    ],
    searchFields: ["reason"],
    titleField: "employeeId",
    portalScope: "employee",
    defaults: () => ({ status: "Pending", appliedAt: new Date().toISOString() }),
    refine: (v) => (v.fromDate && v.toDate && v.toDate < v.fromDate ? "To date must be on or after the from date." : null),
  },

  /* ---------------------------- Payroll -------------------------- */
  payrollRuns: {
    key: "payroll-runs",
    collection: "payrollRuns",
    label: "Payroll Run",
    labelPlural: "Payroll Runs",
    description: "Monthly payroll periods with approval and finalisation control.",
    view: "payroll:view",
    manage: "payroll:process",
    fields: [
      { name: "label", label: "Run Label", type: "text", required: true, inTable: true },
      { name: "period", label: "Period (YYYY-MM)", type: "text", required: true, inTable: true, placeholder: "2026-03" },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Draft", "Under Review", "Pending Approval", "Approved", "Finalized", "Paid", "Cancelled"]), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "label", label: "Run", type: "text" },
      { key: "period", label: "Period", type: "code" },
      { key: "totalEmployees", label: "Employees", type: "number", align: "right" },
      { key: "totalGross", label: "Gross", type: "money", align: "right" },
      { key: "totalDeductions", label: "Deductions", type: "money", align: "right" },
      { key: "totalNet", label: "Net Payable", type: "money", align: "right" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [{ field: "status", label: "Status", options: opts(["Draft", "Under Review", "Pending Approval", "Approved", "Finalized", "Paid", "Cancelled"]) }],
    searchFields: ["label", "period"],
    titleField: "label",
    defaults: () => ({ status: "Draft", preparedAt: new Date().toISOString(), locked: false, totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0, preparedById: "", notes: "" }),
  },

  /**
   * Payroll line items. Produced only by the payroll engine, so this resource is
   * read-only: the UI exposes it as the audit trail behind Incentives and
   * Deductions rather than as an editable grid.
   */
  payrollItems: {
    key: "payroll-items",
    collection: "payrollItems",
    label: "Payroll Line Item",
    labelPlural: "Payroll Line Items",
    description: "Per-employee earnings and deduction breakdown produced by each payroll run.",
    view: "payroll:view",
    manage: "payroll:process",
    fields: [
      { name: "employeeId", label: "Employee", type: "select", required: true, options: allEmployeeOptions, inTable: true, readOnly: true },
      { name: "grossEarnings", label: "Gross Earnings", type: "money", readOnly: true, inTable: true },
      { name: "totalDeductions", label: "Total Deductions", type: "money", readOnly: true, inTable: true },
      { name: "netSalary", label: "Net Salary", type: "money", readOnly: true, inTable: true },
      { name: "remarks", label: "Remarks", type: "textarea", span: 4, readOnly: true },
    ],
    columns: [
      { key: "employeeId", label: "Employee", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "basic", label: "Basic", type: "money", align: "right" },
      { key: "incentives", label: "Incentives", type: "money", align: "right" },
      { key: "overtimeAmount", label: "Overtime", type: "money", align: "right" },
      { key: "grossEarnings", label: "Gross", type: "money", align: "right" },
      { key: "professionalTax", label: "Prof. Tax", type: "money", align: "right" },
      { key: "providentFund", label: "PF", type: "money", align: "right" },
      { key: "esi", label: "ESI", type: "money", align: "right" },
      { key: "tds", label: "TDS", type: "money", align: "right" },
      { key: "totalDeductions", label: "Total Deductions", type: "money", align: "right" },
      { key: "netSalary", label: "Net Salary", type: "money", align: "right" },
      { key: "payableDays", label: "Payable Days", type: "number", align: "right" },
      { key: "lossOfPayDays", label: "LOP Days", type: "number", align: "right" },
    ],
    filters: [],
    searchFields: ["employeeId", "remarks"],
    titleField: "employeeId",
    portalScope: "employee",
    blockDelete: () => "Payroll line items are produced by the payroll engine and cannot be deleted. Recalculate or cancel the run instead.",
    defaults: () => ({ createdAt: new Date().toISOString(), simulated: true }),
  },

  payslips: {
    key: "payslips",
    collection: "payslips",
    label: "Payslip",
    labelPlural: "Payslips",
    description: "Generated payslip documents with the net amount payable for the period.",
    view: "payroll:view",
    manage: "payroll:process",
    fields: [
      { name: "employeeId", label: "Employee", type: "select", required: true, options: allEmployeeOptions, inTable: true, readOnly: true },
      { name: "period", label: "Period", type: "text", required: true, inTable: true, readOnly: true },
      { name: "netSalary", label: "Net Salary", type: "money", required: true, inTable: true, readOnly: true },
      { name: "generatedAt", label: "Generated At", type: "datetime", inTable: true, readOnly: true },
    ],
    columns: [
      { key: "employeeId", label: "Employee", type: "text", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.name ?? "—" },
      { key: "employeeCode", label: "Code", type: "code", value: (r, db) => db.employees.find((e) => e.id === r.employeeId)?.employeeCode ?? "—" },
      { key: "period", label: "Period", type: "code" },
      { key: "netSalary", label: "Net Salary", type: "money", align: "right" },
      { key: "generatedAt", label: "Generated", type: "datetime" },
      { key: "documentId", label: "Document", type: "code", value: (r) => (r.documentId ? String(r.documentId) : "Not filed") },
    ],
    filters: [],
    searchFields: ["period", "employeeId"],
    titleField: "employeeId",
    portalScope: "employee",
    blockDelete: () => "Payslips are statutory records and are retained; they cannot be deleted.",
    defaults: () => ({ generatedAt: new Date().toISOString(), simulated: true }),
  },

  /* ------------------------------ ERP ---------------------------- */
  invoices: {
    key: "invoices",
    collection: "invoices",
    label: "Invoice",
    labelPlural: "Invoices",
    description: "Hospital invoices generated from approved deployments and duty records.",
    view: "erp:invoices:view",
    manage: "erp:invoices:manage",
    fields: [
      { name: "invoiceNo", label: "Invoice Number", type: "text", required: true, inTable: true },
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "billingPeriod", label: "Billing Period", type: "text", required: true, inTable: true },
      { name: "invoiceDate", label: "Invoice Date", type: "date", required: true, inTable: true },
      { name: "dueDate", label: "Due Date", type: "date", required: true, inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(INVOICE_STATUSES), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "invoiceNo", label: "Invoice No.", type: "code" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "billingPeriod", label: "Period", type: "code" },
      { key: "invoiceDate", label: "Date", type: "date" },
      { key: "dueDate", label: "Due", type: "date" },
      { key: "totalAmount", label: "Total", type: "money", align: "right" },
      { key: "amountPaid", label: "Paid", type: "money", align: "right" },
      { key: "outstanding", label: "Outstanding", type: "money", align: "right" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(INVOICE_STATUSES) },
      { field: "hospitalId", label: "Hospital", options: hospitalOptions },
      { field: "billingPeriod", label: "Billing Period" },
    ],
    searchFields: ["invoiceNo", "billingPeriod"],
    titleField: "invoiceNo",
    portalScope: "hospital",
    immutableFields: ["invoiceNo", "hospitalId", "billingPeriod", "invoiceDate", "totalAmount", "items"],
    defaults: () => ({ status: "Draft" }),
  },

  payments: {
    key: "payments",
    collection: "payments",
    label: "Payment Receipt",
    labelPlural: "Payments",
    description: "Simulated payment receipts and allocation against hospital invoices.",
    view: "erp:payments:view",
    manage: "erp:payments:manage",
    fields: [
      { name: "paymentNo", label: "Receipt No.", type: "text", required: true, inTable: true },
      { name: "invoiceId", label: "Invoice", type: "select", required: true, options: (db) => db.invoices.map((i) => ({ value: i.id, label: `${i.invoiceNo} — ${db.hospitals.find((h) => h.id === i.hospitalId)?.name ?? ""}` })), inTable: true },
      { name: "amount", label: "Amount Received (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "method", label: "Payment Method", type: "select", required: true, options: opts(PAYMENT_METHODS), inTable: true },
      { name: "reference", label: "Payment Reference", type: "text", required: true, inTable: true },
      { name: "receivedOn", label: "Received On", type: "date", required: true, inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4, help: "Recording a receipt in the demo does not move money. No bank transfer is initiated." },
    ],
    columns: [
      { key: "paymentNo", label: "Receipt No.", type: "code" },
      { key: "invoiceId", label: "Invoice", type: "text", value: (r, db) => db.invoices.find((i) => i.id === r.invoiceId)?.invoiceNo ?? "—" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "amount", label: "Amount", type: "money", align: "right" },
      { key: "method", label: "Method", type: "text" },
      { key: "reference", label: "Reference", type: "code" },
      { key: "receivedOn", label: "Received", type: "date" },
    ],
    filters: [
      { field: "method", label: "Method", options: opts(PAYMENT_METHODS) },
      { field: "receivedOn", label: "Received On" },
    ],
    searchFields: ["paymentNo", "reference"],
    titleField: "paymentNo",
    portalScope: "hospital",
    defaults: (db) => ({ paymentNo: `RCPT-${new Date().getFullYear()}-${String(db.payments.length + 1).padStart(5, "0")}`, receivedOn: new Date().toISOString().slice(0, 10) }),
    prepare: (values, db) => {
      const inv = db.invoices.find((i) => i.id === values.invoiceId);
      return { ...values, hospitalId: inv?.hospitalId ?? "", simulated: true, recordedById: "" };
    },
  },

  expenses: {
    key: "expenses",
    collection: "expenses",
    label: "Expense",
    labelPlural: "Expenses",
    description: "Expense submissions with receipt references and approval workflow.",
    view: "erp:expenses:view",
    manage: "erp:expenses:manage",
    fields: [
      { name: "category", label: "Category", type: "select", required: true, options: opts(EXPENSE_CATEGORIES), inTable: true },
      { name: "description", label: "Description", type: "text", required: true, inTable: true, span: 2, searchable: true },
      { name: "amount", label: "Amount (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "taxAmount", label: "Tax Amount (₹)", type: "money", min: 0 },
      { name: "vendor", label: "Vendor", type: "text", required: true },
      { name: "expenseDate", label: "Expense Date", type: "date", required: true, inTable: true },
      { name: "department", label: "Department", type: "text", required: true, inTable: true },
      { name: "paymentMethod", label: "Payment Method", type: "select", required: true, options: opts(PAYMENT_METHODS) },
      { name: "status", label: "Status", type: "select", required: true, options: opts(EXPENSE_STATUSES), inTable: true },
    ],
    columns: [
      { key: "expenseNo", label: "Expense No.", type: "code" },
      { key: "category", label: "Category", type: "badge" },
      { key: "description", label: "Description", type: "text" },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "amount", label: "Amount", type: "money", align: "right" },
      { key: "expenseDate", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "category", label: "Category", options: opts(EXPENSE_CATEGORIES) },
      { field: "status", label: "Status", options: opts(EXPENSE_STATUSES) },
    ],
    searchFields: ["expenseNo", "description", "vendor"],
    titleField: "description",
    defaults: (db) => ({
      expenseNo: `MST-EXP-${new Date().getFullYear()}-${String(db.expenses.length + 1).padStart(4, "0")}`,
      status: "Submitted",
      expenseDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      taxAmount: 0,
      submittedById: "",
      approvals: [],
    }),
    prepare: (values, db, user) => ({
      ...values,
      submittedById: user.id,
      department: values.department || user.department,
    }),
  },

  purchaseOrders: {
    key: "purchase-orders",
    collection: "purchaseOrders",
    label: "Purchase Order",
    labelPlural: "Purchase Orders",
    description: "Procurement requests with quantity, value and receipt tracking.",
    view: "erp:expenses:view",
    manage: "erp:procurement:manage",
    fields: [
      { name: "vendor", label: "Vendor", type: "text", required: true, inTable: true, searchable: true },
      { name: "category", label: "Category", type: "select", required: true, options: opts(EXPENSE_CATEGORIES), inTable: true },
      { name: "description", label: "Description", type: "text", required: true, inTable: true, span: 2 },
      { name: "quantity", label: "Quantity", type: "number", required: true, min: 1, inTable: true },
      { name: "unit", label: "Unit", type: "text", required: true, inTable: true },
      { name: "unitPrice", label: "Unit Price (₹)", type: "money", required: true, min: 0, inTable: true },
      { name: "expectedDate", label: "Expected Delivery", type: "date", required: true, inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Draft", "Pending Approval", "Approved", "Partially Received", "Received", "Cancelled"]), inTable: true },
    ],
    columns: [
      { key: "poNo", label: "PO No.", type: "code" },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "quantity", label: "Qty", type: "number", align: "right" },
      { key: "unitPrice", label: "Unit Price", type: "money", align: "right" },
      { key: "totalAmount", label: "Total", type: "money", align: "right" },
      { key: "expectedDate", label: "Expected", type: "date" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [{ field: "status", label: "Status", options: opts(["Draft", "Pending Approval", "Approved", "Partially Received", "Received", "Cancelled"]) }],
    searchFields: ["poNo", "vendor", "description"],
    titleField: "poNo",
    defaults: (db) => ({
      poNo: `MST-PO-${String(db.purchaseOrders.length + 1).padStart(4, "0")}`,
      status: "Draft",
      totalAmount: 0,
      raisedById: "",
      expectedDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }),
    prepare: (values) => ({ ...values, totalAmount: Number(values.quantity) * Number(values.unitPrice) }),
  },

  /* -------------------------- Operations ------------------------- */
  requirements: {
    key: "requirements",
    collection: "requirements",
    label: "Hospital Requirement",
    labelPlural: "Hospital Requirements",
    description: "Staffing demand raised by hospitals and fulfilled through doctor allocation.",
    view: "crm:hospitals:view",
    manage: "workforce:deployments:manage",
    fields: [
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "designation", label: "Designation", type: "text", required: true, inTable: true, searchable: true },
      { name: "category", label: "Staffing Category", type: "select", required: true, options: categoryOptions, inTable: true },
      { name: "count", label: "Doctors Required", type: "number", required: true, min: 1, inTable: true },
      { name: "allocated", label: "Allocated", type: "number", min: 0, inTable: true },
      { name: "shiftRequirement", label: "Shift Requirement", type: "text", required: true, inTable: true },
      { name: "minExperienceYears", label: "Min Experience (years)", type: "number", min: 0 },
      { name: "requiredQualification", label: "Required Qualification", type: "text", required: true },
      { name: "budgetPerDoctor", label: "Budget per Doctor (₹)", type: "money", required: true, min: 0 },
      { name: "targetDate", label: "Target Date", type: "date", required: true, inTable: true },
      { name: "priority", label: "Priority", type: "select", required: true, options: opts(REQUISITION_PRIORITIES), inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(REQUIREMENT_STATUSES), inTable: true },
      { name: "notes", label: "Notes", type: "textarea", span: 4 },
    ],
    columns: [
      { key: "referenceNo", label: "Reference", type: "code" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "count", label: "Required", type: "number", align: "right" },
      { key: "allocated", label: "Allocated", type: "number", align: "right" },
      { key: "targetDate", label: "Target", type: "date" },
      { key: "priority", label: "Priority", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(REQUIREMENT_STATUSES) },
      { field: "priority", label: "Priority", options: opts(REQUISITION_PRIORITIES) },
      { field: "hospitalId", label: "Hospital", options: hospitalOptions },
    ],
    searchFields: ["referenceNo", "designation"],
    titleField: "referenceNo",
    portalScope: "hospital",
    defaults: (db) => {
      const n = db.requirements.length + 1;
      return {
        referenceNo: `HOS-REQ-${String(n).padStart(4, "0")}`,
        status: "Open",
        priority: "Medium",
        allocated: 0,
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        requestedAt: new Date().toISOString(),
        requestedBy: "",
      };
    },
  },

  "service-requests": {
    key: "service-requests",
    collection: "serviceRequests",
    label: "Service Request",
    labelPlural: "Service Requests",
    description: "Client-raised replacement, transfer, escalation and support requests with SLA tracking.",
    view: "crm:hospitals:view",
    manage: "workforce:deployments:manage",
    fields: [
      { name: "type", label: "Request Type", type: "select", required: true, options: opts(SERVICE_REQUEST_TYPES), inTable: true },
      { name: "hospitalId", label: "Hospital", type: "select", required: true, options: hospitalOptions, inTable: true },
      { name: "deploymentId", label: "Related Deployment", type: "select", options: (db) => db.deployments.map((d) => ({ value: d.id, label: d.deploymentCode })) },
      { name: "subject", label: "Subject", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "description", label: "Description", type: "textarea", required: true, span: 4 },
      { name: "priority", label: "Priority", type: "select", required: true, options: opts(SERVICE_REQUEST_PRIORITIES), inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(SERVICE_REQUEST_STATUSES), inTable: true },
      { name: "slaHours", label: "SLA (hours)", type: "number", required: true, min: 1, inTable: true },
    ],
    columns: [
      { key: "requestNo", label: "Request No.", type: "code" },
      { key: "type", label: "Type", type: "badge" },
      { key: "subject", label: "Subject", type: "text" },
      { key: "hospitalId", label: "Hospital", type: "text", value: (r, db) => db.hospitals.find((h) => h.id === r.hospitalId)?.name ?? "—" },
      { key: "priority", label: "Priority", type: "badge" },
      { key: "status", label: "Status", type: "badge" },
      { key: "createdAt", label: "Raised", type: "date" },
    ],
    filters: [
      { field: "status", label: "Status", options: opts(SERVICE_REQUEST_STATUSES) },
      { field: "type", label: "Type", options: opts(SERVICE_REQUEST_TYPES) },
      { field: "priority", label: "Priority", options: opts(SERVICE_REQUEST_PRIORITIES) },
    ],
    searchFields: ["requestNo", "subject", "description"],
    titleField: "requestNo",
    portalScope: "hospital",
    defaults: (db) => {
      const n = db.serviceRequests.length + 1;
      return {
        requestNo: `SR-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`,
        status: "Open",
        priority: "Medium",
        slaHours: 24,
        createdAt: new Date().toISOString(),
        raisedById: "",
        raisedByName: "",
      };
    },
    prepare: (values, db, user) => ({
      ...values,
      raisedById: user.id,
      raisedByName: user.name,
      employeeId: db.deployments.find((d) => d.id === values.deploymentId)?.employeeId,
    }),
  },

  /* --------------------------- Documents ------------------------- */
  documents: {
    key: "documents",
    collection: "documents",
    label: "Document",
    labelPlural: "Documents",
    description: "Central document register with categorisation, access control and expiry tracking.",
    view: "documents:view",
    manage: "documents:manage",
    fields: [
      { name: "name", label: "Document Name", type: "text", required: true, inTable: true, searchable: true, span: 2 },
      { name: "category", label: "Category", type: "select", required: true, options: opts(DOCUMENT_CATEGORIES), inTable: true },
      { name: "ownerType", label: "Linked To", type: "select", required: true, options: opts(["Candidate", "Employee", "Hospital", "Contract", "Invoice", "Payslip", "Expense", "Deployment", "System"]), inTable: true },
      { name: "ownerId", label: "Record ID", type: "text", required: true, help: "Identifier of the linked record (e.g. EMP-0004)." },
      { name: "expiresAt", label: "Expiry Date", type: "date", inTable: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Active", "Archived", "Expiring Soon", "Expired"]), inTable: true },
    ],
    columns: [
      { key: "name", label: "Document", type: "text" },
      { key: "category", label: "Category", type: "badge" },
      { key: "ownerType", label: "Linked To", type: "text" },
      { key: "ownerId", label: "Record", type: "code" },
      { key: "sizeKb", label: "Size (KB)", type: "number", align: "right" },
      { key: "expiresAt", label: "Expires", type: "date" },
      { key: "status", label: "Status", type: "badge" },
      { key: "uploadedAt", label: "Uploaded", type: "date" },
    ],
    filters: [
      { field: "category", label: "Category", options: opts(DOCUMENT_CATEGORIES) },
      { field: "status", label: "Status", options: opts(["Active", "Archived", "Expiring Soon", "Expired"]) },
      { field: "ownerType", label: "Linked To", options: opts(["Candidate", "Employee", "Hospital", "Contract", "Invoice", "Payslip", "Expense", "Deployment", "System"]) },
    ],
    searchFields: ["name", "fileName", "ownerId"],
    titleField: "name",
    defaults: (db, user) => ({
      fileName: `${String(db.documents.length + 1).padStart(5, "0")}_document.pdf`,
      mimeType: "application/pdf",
      sizeKb: 120,
      uploadedById: user.id,
      status: "Active",
      accessRoles: ["Super Admin", "Business Admin"],
      simulated: true,
    }),
  },

  /* ----------------------------- Admin --------------------------- */
  users: {
    key: "users",
    collection: "users",
    label: "User",
    labelPlural: "Users & Roles",
    description: "Platform users, their role assignments and portal scoping.",
    view: "users:manage",
    manage: "users:manage",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, inTable: true, searchable: true },
      { name: "email", label: "Email", type: "email", required: true, inTable: true },
      { name: "role", label: "Role", type: "select", required: true, options: opts(["Super Admin", "Business Admin", "HR Manager", "Recruiter", "Payroll Manager", "Finance Manager", "Operations Manager", "Hospital Client", "Doctor"]), inTable: true },
      { name: "department", label: "Department", type: "text", required: true, inTable: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "status", label: "Status", type: "select", required: true, options: opts(["Active", "Inactive"]), inTable: true },
      { name: "hospitalId", label: "Hospital (for client portal)", type: "select", options: hospitalOptions, help: "Only set for the Hospital Client role." },
    ],
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "role", label: "Role", type: "badge" },
      { key: "department", label: "Department", type: "text" },
      { key: "status", label: "Status", type: "badge" },
    ],
    filters: [
      { field: "role", label: "Role", options: opts(["Super Admin", "Business Admin", "HR Manager", "Recruiter", "Payroll Manager", "Finance Manager", "Operations Manager", "Hospital Client", "Doctor"]) },
      { field: "status", label: "Status", options: opts(["Active", "Inactive"]) },
    ],
    searchFields: ["name", "email", "department"],
    titleField: "name",
    defaults: () => ({
      status: "Active",
      passwordHint: "Demo@2026",
      createdAt: new Date().toISOString(),
      avatarColor: "#176B87",
    }),
    refine: (values) => (values.role === "Hospital Client" && !values.hospitalId ? "A Hospital Client user must be scoped to a hospital." : null),
  },
};

/** Lookup by registry key (`payrollRuns`) or by URL segment (`payroll-runs`). */
const BY_URL_KEY = new Map<string, ResourceDef>(
  Object.values(RESOURCES).map((r) => [r.key, r] as const)
);

export function getResource(key: string) {
  return RESOURCES[key] ?? BY_URL_KEY.get(key) ?? null;
}

export function listResources(): Record<string, ResourceDef> {
  return RESOURCES;
}

export const moneyText = money;
export type { ColumnDef, FieldDef, ResourceDef };
export type { StaffingCategory };
