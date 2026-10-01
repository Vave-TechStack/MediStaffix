/**
 * MediStaffix domain model.
 *
 * This module is the single source of truth for entity shapes used by the demo
 * data layer (`src/lib/store.ts`) and by the production Prisma schema
 * (`prisma/schema.prisma`). The same identifiers are reused in both so the demo
 * frontend can be re-pointed at Postgres without rewriting UI code.
 *
 * IMPORTANT: all records created by the demo seeder are fictional. No value in
 * this file should be interpreted as a real medical registration, real patient
 * record, or real financial instrument.
 */

/* ------------------------------------------------------------------ */
/* Enumerations                                                        */
/* ------------------------------------------------------------------ */

export const HOSPITAL_TYPES = [
  "Multi-Speciality Hospital",
  "Super-Speciality Hospital",
  "General Hospital",
  "Clinic Chain",
  "Diagnostic Centre",
  "Nursing Home",
  "Government Hospital",
  "Corporate Hospital",
] as const;
export type HospitalType = (typeof HOSPITAL_TYPES)[number];

export const CONTRACT_STATUSES = [
  "Draft",
  "Active",
  "Expiring Soon",
  "Expired",
  "Terminated",
  "Renewed",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CLIENT_STATUSES = ["Prospect", "Active", "On Hold", "Churned"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = [
  "Referral",
  "Website",
  "Cold Call",
  "LinkedIn",
  "Trade Event",
  "Existing Client",
  "Email Campaign",
  "Hospital Association",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const STAFFING_CATEGORIES = [
  "Consultant Physician",
  "Specialist Doctor",
  "Resident Doctor",
  "Medical Officer",
  "Nursing Staff",
  "Paramedical Staff",
  "Allied Health Staff",
  "Administrative Staff",
] as const;
export type StaffingCategory = (typeof STAFFING_CATEGORIES)[number];

export const CANDIDATE_STAGES = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Offer Released",
  "Joined",
  "Rejected",
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export const CANDIDATE_STATUSES = ["Active", "On Hold", "Placed", "Withdrawn", "Rejected"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "Not Initiated",
  "Documents Submitted",
  "In Verification",
  "Verified (Demo Record)",
  "Discrepancy Found",
  "Rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REQUISITION_STATUSES = ["Open", "Partially Filled", "Filled", "On Hold", "Closed", "Cancelled"] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const REQUISITION_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type RequisitionPriority = (typeof REQUISITION_PRIORITIES)[number];

export const INTERVIEW_MODES = ["In Person", "Video Call", "Phone", "Panel"] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_RESULTS = ["Pending", "Strongly Recommended", "Recommended", "Neutral", "Not Recommended", "Rejected"] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const OFFER_STATUSES = ["Draft", "Released", "Accepted", "Declined", "Withdrawn", "Expired"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Locum Tenens", "Visiting"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_STATUSES = ["Active", "On Notice", "Inactive", "Resigned", "Terminated"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const DEPLOYMENT_STATUSES = [
  "Proposed",
  "Allocated",
  "Confirmed",
  "Active",
  "On Leave",
  "Replaced",
  "Transferred",
  "Completed",
  "Terminated",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const SHIFT_TYPES = ["Day", "Night", "Rotational", "General", "On Call"] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SHIFT_STATUSES = ["Scheduled", "Confirmed", "Completed", "Missed", "Swap Requested", "Cancelled"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "Weekly Off",
  "On Leave",
  "Holiday",
  "Off Duty",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave", "Compensatory Off"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled", "Withdrawn"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const PAYROLL_RUN_STATUSES = ["Draft", "Under Review", "Pending Approval", "Approved", "Finalized", "Paid", "Cancelled"] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYMENT_STATUSES = ["Unpaid", "Processing", "Paid", "Failed", "On Hold"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const INVOICE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const BILLING_MODELS = ["Per Doctor Per Month", "Per Shift", "Per Hour", "Fixed Retainer", "Percentage of Revenue"] as const;
export type BillingModel = (typeof BILLING_MODELS)[number];

export const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Advance", "On Delivery"] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const EXPENSE_CATEGORIES = [
  "Recruitment",
  "Salaries",
  "Office Expenses",
  "Marketing",
  "Travel",
  "Technology",
  "Insurance",
  "Professional Fees",
  "Other Expenses",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Reimbursed"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const PAYMENT_METHODS = ["NEFT/RTGS", "Cheque", "UPI", "Card", "Cash", "Letter of Credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const REQUIREMENT_STATUSES = ["Open", "Partially Allocated", "Fully Allocated", "Closed", "On Hold"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const SERVICE_REQUEST_TYPES = [
  "Replacement Request",
  "Transfer Request",
  "Escalation",
  "Attendance Issue",
  "Credential Update",
  "Billing Query",
  "Other",
] as const;
export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[number];

export const SERVICE_REQUEST_STATUSES = ["Open", "Acknowledged", "In Progress", "Resolved", "Rejected", "Closed"] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type ServiceRequestPriority = (typeof SERVICE_REQUEST_PRIORITIES)[number];

export const DOCUMENT_CATEGORIES = [
  "Doctor Resume",
  "Medical Registration Document",
  "Qualification Certificate",
  "Employment Agreement",
  "Hospital Contract",
  "Offer Letter",
  "Appointment Letter",
  "Payslip",
  "Invoice",
  "Deployment Letter",
  "Insurance Document",
  "Expense Receipt",
  "Other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const ROLES = [
  "Super Admin",
  "Business Admin",
  "HR Manager",
  "Recruiter",
  "Payroll Manager",
  "Finance Manager",
  "Operations Manager",
  "Hospital Client",
  "Doctor",
] as const;
export type Role = (typeof ROLES)[number];

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  phone: string;
  /** Demo only. Production builds hash this with bcrypt and never store plaintext. */
  passwordHint: string;
  status: "Active" | "Inactive";
  createdAt: string;
  /** Hospital client portal scoping */
  hospitalId?: string;
  /** Doctor self-service scoping */
  employeeId?: string;
  avatarColor: string;
}

export interface HospitalContact {
  id: string;
  hospitalId: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  type: HospitalType;
  registrationNo: string;
  registrationAuthority: string;
  contactPerson: string;
  hrManager: string;
  medicalSuperintendent: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  beds: number;
  requiredCategories: StaffingCategory[];
  accountManagerId: string;
  contractStatus: ContractStatus;
  paymentTerms: PaymentTerms;
  clientStatus: ClientStatus;
  onboardedAt: string;
  notes: string;
  archived: boolean;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: "Call" | "Email" | "Meeting" | "Note" | "Site Visit" | "Proposal";
  summary: string;
  details: string;
  performedById: string;
  performedAt: string;
  /** Simulated: records intent only, never dispatches a real message. */
  simulated: boolean;
}

export interface Lead {
  id: string;
  name: string;
  organization: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: LeadSource;
  interestedCategories: StaffingCategory[];
  estimatedMonthlyValue: number;
  stage: LeadStage;
  assignedToId: string;
  nextFollowUp: string;
  probability: number;
  notes: string;
  convertedHospitalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  subject: string;
  relatedType: "Lead" | "Hospital" | "Candidate" | "Contract" | "Requisition" | "Service Request";
  relatedId: string;
  dueAt: string;
  ownerId: string;
  priority: "Low" | "Medium" | "High";
  notes: string;
  status: "Pending" | "Completed" | "Overdue" | "Cancelled";
  completedAt?: string;
}

export interface Opportunity {
  id: string;
  name: string;
  hospitalId: string;
  leadId?: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  stage: LeadStage;
  staffingCategories: StaffingCategory[];
  headcount: number;
  ownerId: string;
  createdAt: string;
}

export interface ContractRate {
  id: string;
  contractId: string;
  category: StaffingCategory;
  designation: string;
  rate: number;
  unit: "Per Doctor / Month" | "Per Shift" | "Per Hour";
}

export interface Contract {
  id: string;
  number: string;
  title: string;
  hospitalId: string;
  startDate: string;
  endDate: string;
  billingModel: BillingModel;
  categories: StaffingCategory[];
  replacementTerms: string;
  paymentTerms: PaymentTerms;
  status: ContractStatus;
  signedByHospital: string;
  signedByCompany: string;
  signedAt?: string;
  documentId?: string;
  notes: string;
  createdAt: string;
}

export interface CandidateDocument {
  id: string;
  candidateId: string;
  type: "Resume" | "Medical Registration" | "Degree Certificate" | "Experience Letter" | "ID Proof" | "Other";
  name: string;
  uploadedAt: string;
  status: "Uploaded" | "Under Review" | "Accepted" | "Rejected";
  /** Demo placeholder: no real file bytes are stored. */
  simulated: boolean;
}

export interface Candidate {
  id: string;
  candidateCode: string;
  name: string;
  mobile: string;
  email: string;
  qualification: string;
  specialization: string;
  registrationNumber: string;
  stateCouncil: string;
  experienceYears: number;
  expectedSalary: number;
  preferredLocation: string;
  currentLocation: string;
  availability: string;
  stage: CandidateStage;
  status: CandidateStatus;
  verificationStatus: VerificationStatus;
  source: LeadSource;
  referredBy?: string;
  noticePeriodDays: number;
  rating: number;
  documents: CandidateDocument[];
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRequisition {
  id: string;
  jobCode: string;
  hospitalId: string;
  designation: string;
  category: StaffingCategory;
  qualification: string;
  specialization: string;
  vacancies: number;
  filled: number;
  salaryBudget: number;
  workLocation: string;
  shiftRequirement: string;
  contractDuration: string;
  joiningDeadline: string;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  hiringManagerId: string;
  recruiterId: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  requisitionId: string;
  candidateId: string;
  appliedAt: string;
  stage: CandidateStage;
  source: LeadSource;
  hospitalFitScore: number;
  recruiterNotes: string;
  rejectedReason?: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  round: number;
  scheduledAt: string;
  mode: InterviewMode;
  interviewers: string[];
  status: "Scheduled" | "Completed" | "Rescheduled" | "Cancelled" | "No Show";
  result: InterviewResult;
  scorecard: { competency: string; rating: number; notes: string }[];
  feedback?: string;
}

export interface Offer {
  id: string;
  offerCode: string;
  applicationId: string;
  candidateId: string;
  requisitionId: string;
  issuedAt: string;
  joiningDate: string;
  expiresAt: string;
  annualCtc: number;
  fixedSalary: number;
  variablePay: number;
  status: OfferStatus;
  notes: string;
  documentId?: string;
  respondedAt?: string;
}

export interface DoctorProfile {
  /** Kept separate from Candidate so the same person is never duplicated. */
  candidateId?: string;
  specialisation: string;
  categories: StaffingCategory[];
  registrationCouncil: string;
  registrationNumber: string;
  experienceYears: number;
  skills: string[];
  languages: string[];
  preferredShift: ShiftType;
}

export interface BankDetails {
  accountHolder: string;
  bankName: string;
  accountNumberMasked: string;
  ifsc: string;
  branch: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  reportingManagerId?: string;
  employmentStatus: EmploymentStatus;
  doctorProfile?: DoctorProfile;
  salaryStructureId?: string;
  bankDetails?: BankDetails;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  archived: boolean;
  createdAt: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  ctc: number;
  basicPercent: number;
  hraPercent: number;
  specialAllowancePercent: number;
  conveyancePercent: number;
  /** Statutory components are configurable per policy; see `StatutoryConfig`. */
  professionalTaxEnabled: boolean;
  professionalTaxAmount: number;
  providentFundEnabled: boolean;
  providentFundPercent: number;
  esiEnabled: boolean;
  esiPercent: number;
  tdsApplicable: boolean;
  tdsPercent: number;
  revisionNote: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  deploymentCode: string;
  hospitalId: string;
  employeeId: string;
  requisitionId: string;
  designation: string;
  startDate: string;
  endDate: string;
  shift: ShiftType;
  monthlySalary: number;
  monthlyHospitalBilling: number;
  status: DeploymentStatus;
  reportingContact: string;
  reportingContactPhone: string;
  contractId: string;
  replacementOfDeploymentId?: string;
  replacementStatus: "Not Required" | "Requested" | "In Progress" | "Replaced" | "Cancelled";
  letterId?: string;
  notes: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  deploymentId: string;
  hospitalId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: ShiftType;
  status: ShiftStatus;
  swapRequestFrom?: string;
  swapRequestTo?: string;
  approvedBy?: string;
  notes: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  deploymentId?: string;
  hospitalId?: string;
  date: string;
  status: AttendanceStatus;
  shiftId?: string;
  checkIn?: string;
  checkOut?: string;
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
  correctionRequested: boolean;
  correctionReason?: string;
  approvedBy?: string;
  remarks: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  approverId?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface LeaveBalance {
  employeeId: string;
  year: number;
  casual: number;
  sick: number;
  earned: number;
  unpaid: number;
  compensatory: number;
}

export interface PayrollItem {
  id: string;
  runId: string;
  employeeId: string;
  deploymentId?: string;
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  incentives: number;
  overtimeAmount: number;
  arrears: number;
  reimbursements: number;
  professionalTax: number;
  providentFund: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  advanceRecovery: number;
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  payableDays: number;
  lossOfPayDays: number;
  remarks: string;
}

export interface PayrollRun {
  id: string;
  period: string;
  label: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  preparedById: string;
  approvedById?: string;
  preparedAt: string;
  approvedAt?: string;
  finalizedAt?: string;
  paidAt?: string;
  locked: boolean;
  notes: string;
}

export interface Payslip {
  id: string;
  runId: string;
  itemId: string;
  employeeId: string;
  period: string;
  netSalary: number;
  generatedAt: string;
  documentId?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  deploymentId?: string;
  employeeId?: string;
  description: string;
  category: StaffingCategory;
  shifts: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  hospitalId: string;
  contractId: string;
  billingPeriod: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  serviceChargePercent: number;
  serviceChargeAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  status: InvoiceStatus;
  approvedById?: string;
  approvedAt?: string;
  sentAt?: string;
  documentId?: string;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  invoiceId: string;
  hospitalId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  receivedOn: string;
  recordedById: string;
  simulated: boolean;
  notes: string;
}

export interface ExpenseApproval {
  id: string;
  expenseId: string;
  approverId: string;
  action: "Submitted" | "Approved" | "Rejected" | "Reimbursed";
  note: string;
  at: string;
}

export interface Expense {
  id: string;
  expenseNo: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  submittedById: string;
  department: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  documentId?: string;
  approvals: ExpenseApproval[];
  taxAmount: number;
  vendor: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendor: string;
  category: ExpenseCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Partially Received" | "Received" | "Cancelled";
  raisedById: string;
  expectedDate: string;
  createdAt: string;
}

export interface HospitalRequirement {
  id: string;
  referenceNo: string;
  hospitalId: string;
  category: StaffingCategory;
  designation: string;
  count: number;
  allocated: number;
  shiftRequirement: string;
  minExperienceYears: number;
  requiredQualification: string;
  budgetPerDoctor: number;
  priority: RequisitionPriority;
  status: RequirementStatus;
  requestedBy: string;
  requestedAt: string;
  targetDate: string;
  notes: string;
}

export interface ServiceRequest {
  id: string;
  requestNo: string;
  type: ServiceRequestType;
  hospitalId: string;
  deploymentId?: string;
  employeeId?: string;
  subject: string;
  description: string;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  raisedById: string;
  raisedByName: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  slaHours: number;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category: DocumentCategory;
  ownerType: "Candidate" | "Employee" | "Hospital" | "Contract" | "Invoice" | "Payslip" | "Expense" | "Deployment" | "System";
  ownerId: string;
  fileName: string;
  mimeType: string;
  sizeKb: number;
  uploadedById: string;
  uploadedAt: string;
  expiresAt?: string;
  status: "Active" | "Archived" | "Expiring Soon" | "Expired";
  accessRoles: Role[];
  /** Demo placeholder. No binary content is persisted in the demo environment. */
  simulated: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "Approval" | "Recruitment" | "Shift" | "Contract" | "Payment" | "Payroll" | "System";
  severity: "Info" | "Success" | "Warning" | "Critical";
  link: string;
  createdAt: string;
  readBy: string[];
  audience: Role[] | "All";
}

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  ip: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  at: string;
  entity: string;
  entityId: string;
  hospitalId?: string;
  type: string;
  summary: string;
  actorId: string;
}

export interface Database {
  users: User[];
  hospitals: Hospital[];
  hospitalContacts: HospitalContact[];
  leads: Lead[];
  leadActivities: LeadActivity[];
  followUps: FollowUp[];
  opportunities: Opportunity[];
  contracts: Contract[];
  contractRates: ContractRate[];
  candidates: Candidate[];
  requisitions: JobRequisition[];
  applications: JobApplication[];
  interviews: Interview[];
  offers: Offer[];
  employees: Employee[];
  salaryStructures: SalaryStructure[];
  deployments: Deployment[];
  shifts: Shift[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  payrollRuns: PayrollRun[];
  payrollItems: PayrollItem[];
  payslips: Payslip[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  purchaseOrders: PurchaseOrder[];
  requirements: HospitalRequirement[];
  serviceRequests: ServiceRequest[];
  documents: DocumentRecord[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  settings: Settings;
}

export interface StatutoryConfig {
  jurisdictionLabel: string;
  currency: string;
  currencySymbol: string;
  professionalTax: { enabled: boolean; amountPerMonth: number; note: string };
  providentFund: { enabled: boolean; percent: number; wageCeiling: number; note: string };
  esi: { enabled: boolean; percent: number; wageCeiling: number; note: string };
  tds: { enabled: boolean; note: string };
  invoiceTax: { percent: number; label: string; note: string };
  serviceCharge: { percent: number; label: string; note: string };
  disclaimer: string;
}

export interface Settings {
  companyName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  gstin: string;
  statutory: StatutoryConfig;
  defaultPaymentTerms: PaymentTerms;
  defaultInvoiceDueDays: number;
  standardShiftHours: number;
  overtimeRateMultiplier: number;
  leavePolicy: Record<LeaveType, number>;
  documentExpiryAlertDays: number;
  contractExpiryAlertDays: number;
  demoMode: boolean;
  dataRetainedFrom: string;
}
