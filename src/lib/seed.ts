/**
 * Demo data seeder for MediStaffix.
 *
 * Every record produced here is FICTIONAL. Hospital names, people, medical
 * registration numbers, bank details, contracts and financial figures are
 * synthetic and exist only to make the demonstration environment explorable.
 * They must not be represented as real entities or real credentials.
 */

import type {
  ActivityLog,
  Attendance,
  AttendanceStatus,
  Candidate,
  CandidateStage,
  Contract,
  Database,
  Deployment,
  DocumentRecord,
  Employee,
  Expense,
  ExpenseCategory,
  FollowUp,
  Hospital,
  HospitalContact,
  HospitalRequirement,
  Interview,
  Invoice,
  JobApplication,
  JobRequisition,
  LeaveBalance,
  LeaveRequest,
  Lead,
  LeadActivity,
  Notification,
  Offer,
  Opportunity,
  PayrollItem,
  PayrollRun,
  Payment,
  Payslip,
  PurchaseOrder,
  Role,
  SalaryStructure,
  ServiceRequest,
  Settings,
  Shift,
  ShiftType,
  StaffingCategory,
  User,
  AuditLog,
} from "./types";

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                             */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260115);
const rand = () => rnd();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T,>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const chance = (p: number) => rand() < p;
const round0 = (n: number) => Math.round(n);

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const TODAY = new Date();
const TODAY_ISO = toISO(TODAY);
const CURRENT_PERIOD = TODAY_ISO.slice(0, 7);

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, days: number) {
  const n = new Date(d.getTime());
  n.setDate(n.getDate() + days);
  return n;
}
function addMonths(d: Date, months: number) {
  const n = new Date(d.getTime());
  n.setMonth(n.getMonth() + months);
  return n;
}
function monthStart(offset: number) {
  return new Date(TODAY.getFullYear(), TODAY.getMonth() + offset, 1);
}
function monthEnd(offset: number) {
  const s = monthStart(offset);
  return new Date(s.getFullYear(), s.getMonth() + 1, 0);
}
function periodOf(offset: number) {
  return toISO(monthStart(offset)).slice(0, 7);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function ts(dayOffset: number, hour = 10, minute = 0) {
  const d = addDays(TODAY, dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Name & vocabulary pools (fictional)                                  */
/* ------------------------------------------------------------------ */

const FIRST_M = [
  "Aarav", "Vihaan", "Arjun", "Rohan", "Kabir", "Ishaan", "Aditya", "Karan", "Nikhil", "Rahul",
  "Siddharth", "Manish", "Pranav", "Varun", "Yash", "Harsh", "Devansh", "Amit", "Sanjay", "Rakesh",
  "Anil", "Vivek", "Sameer", "Naveen", "Tarun", "Gaurav", "Piyush", "Abhishek", "Suresh", "Ramesh",
  "Imran", "Faisal", "Zoya", "Aarif", "Nikhil", "Dinesh", "Sunil", "Manoj", "Ganesh", "Prakash",
];
const FIRST_F = [
  "Aanya", "Diya", "Ishita", "Priya", "Neha", "Kavya", "Riya", "Sneha", "Meera", "Anjali",
  "Pooja", "Shreya", "Nandini", "Divya", "Aditi", "Swara", "Trisha", "Nikita", "Rashmi", "Lakshmi",
  "Farah", "Zara", "Hina", "Farhan", "Rehan", "Zubin",
];
const LAST = [
  "Sharma", "Verma", "Iyer", "Nair", "Reddy", "Rao", "Patel", "Shah", "Mehta", "Joshi",
  "Kulkarni", "Deshmukh", "Chatterjee", "Banerjee", "Mukherjee", "Gupta", "Malhotra", "Kapoor",
  "Bhatt", "Trivedi", "Agarwal", "Bansal", "Chauhan", "Rathore", "Pillai", "Gowda", "Menon", "Shetty",
  "Sinha", "Saxena", "Rastogi", "Thakur",
];

const CITIES = [
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Kochi", state: "Kerala" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Delhi", state: "Delhi" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Chandigarh", state: "Punjab" },
  { city: "Bhopal", state: "Madhya Pradesh" },
];

const STATES_COUNCIL: Record<string, string> = {
  Karnataka: "Karnataka Medical Council",
  Telangana: "Telangana State Medical Council",
  Maharashtra: "Maharashtra Medical Council",
  "Tamil Nadu": "Tamil Nadu Medical Council",
  Kerala: "Kerala State Medical Council",
  Gujarat: "Gujarat Medical Council",
  Rajasthan: "Rajasthan Medical Council",
  "Uttar Pradesh": "Uttar Pradesh Medical Council",
  Delhi: "Delhi Medical Council",
  "West Bengal": "West Bengal Medical Council",
  "Madhya Pradesh": "Madhya Pradesh Medical Council",
  Punjab: "Punjab Medical Council",
};

const QUALIFICATIONS = ["MBBS, MD", "MBBS, MD, DM", "MBBS, MS", "MBBS, DNB", "MBBS, MD, DNB", "MBBS, DCH", "MBBS, MDS", "MBBS, MPH"];
const QUAL_SHORT = ["MBBS", "MBBS MD", "MBBS DNB", "MBBS MS", "MBBS DM"];

const DESIGNATIONS: Record<StaffingCategory, string[]> = {
  "Consultant Physician": ["Consultant Cardiologist", "Consultant Neurologist", "Consultant General Physician", "Consultant Pulmonologist", "Consultant Nephrologist"],
  "Specialist Doctor": ["Senior Resident Physician", "Registrar", "Specialist Anaesthetist", "Specialist Radiologist", "Specialist Pathologist"],
  "Resident Doctor": ["Junior Resident", "Senior Resident", "Medical Officer", "House Physician"],
  "Medical Officer": ["Medical Officer", "Duty Medical Officer", "Clinical Officer"],
  "Nursing Staff": ["Staff Nurse", "Senior Staff Nurse", "Nursing Supervisor", "ICU Nurse"],
  "Paramedical Staff": ["Emergency Medical Technician", "Radiology Technician", "Lab Technician", "Phlebotomist"],
  "Allied Health Staff": ["Physiotherapist", "Occupational Therapist", "Dietitian", "Respiratory Therapist"],
  "Administrative Staff": ["Billing Executive", "Front Desk Executive", "HR Executive"],
};

const SPECIALISATIONS = [
  "General Medicine", "Cardiology", "Neurology", "Orthopaedics", "Paediatrics", "Gynaecology",
  "Nephrology", "Pulmonology", "Gastroenterology", "Dermatology", "Oncology", "Anaesthesiology",
  "Radiology", "Pathology", "Emergency Medicine", "Psychiatry", "Urology", "Endocrinology",
];

const LANGUAGES = ["English", "Hindi", "Kannada", "Telugu", "Marathi", "Tamil", "Malayalam", "Gujarati", "Bengali", "Marwari"];

const AVATAR_COLORS = ["#176B87", "#20B89A", "#123047", "#3B82F6", "#8B5CF6", "#D97706", "#DC2626", "#0891B2", "#4F46E5", "#059669"];

type Department = string;

const INTERNAL_TEAM: { name: string; role: Role; department: Department; designation: string }[] = [
  { name: "Meera Raghavan", role: "Super Admin", department: "Leadership", designation: "Founder & Managing Director" },
  { name: "Aditya Kulkarni", role: "Business Admin", department: "Operations", designation: "Business Head" },
  { name: "Nandini Iyer", role: "HR Manager", department: "Human Resources", designation: "HR Manager" },
  { name: "Faisal Khan", role: "Recruiter", department: "Recruitment", designation: "Senior Talent Acquisition Specialist" },
  { name: "Sneha Pillai", role: "Recruiter", department: "Recruitment", designation: "Talent Acquisition Specialist" },
  { name: "Rohit Bansal", role: "Recruiter", department: "Recruitment", designation: "Recruitment Coordinator" },
  { name: "Priya Menon", role: "Payroll Manager", department: "Finance", designation: "Payroll Manager" },
  { name: "Vikram Shah", role: "Finance Manager", department: "Finance", designation: "Finance Controller" },
  { name: "Arun Prasad", role: "Operations Manager", department: "Operations", designation: "Deployment Manager" },
  { name: "Kavya Reddy", role: "HR Manager", department: "Human Resources", designation: "HR Executive" },
];

const DEMO_PASSWORD = "Demo@2026";

function makeUser(spec: { name: string; role: Role; department: string; designation: string }, i: number): User {
  const email = `${spec.name.toLowerCase().replace(/[^a-z]+/g, ".")}@medistaffix.demo`;
  return {
    id: `USR-${String(i + 1).padStart(3, "0")}`,
    name: spec.name,
    email,
    role: spec.role,
    department: spec.department,
    phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
    passwordHint: DEMO_PASSWORD,
    status: "Active",
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    createdAt: ts(-randInt(400, 900)),
  };
}

function regNum(prefix: string) {
  return `${prefix}/${randInt(10000, 99999)}/${randInt(2000, 2025)}`;
}

function fullName(gender: "M" | "F" = chance(0.75) ? "M" : "F") {
  return `${pick(gender === "M" ? FIRST_M : FIRST_F)} ${pick(LAST)}`;
}

/* ------------------------------------------------------------------ */
/* Seeder                                                              */
/* ------------------------------------------------------------------ */

export function buildSeedDatabase(): Database {
  const users = INTERNAL_TEAM.map(makeUser);
  const superAdmin = users[0];
  const businessAdmin = users[1];
  const hrManager = users[2];
  const recruiters = users.filter((u) => u.role === "Recruiter");
  const financeManager = users[7];
  const opsManager = users[8];

  /* ---------------- Hospitals ---------------- */
  const hospitals: Hospital[] = [];
  const hospitalContacts: HospitalContact[] = [];
  const HOSPITAL_BLUEPRINT: { name: string; type: Hospital["type"]; beds: number; status: Hospital["clientStatus"] }[] = [
    { name: "Aster Grand Medical Centre", type: "Super-Speciality Hospital", beds: 640, status: "Active" },
    { name: "Sanjeevani Multispeciality Hospital", type: "Multi-Speciality Hospital", beds: 380, status: "Active" },
    { name: "Vivekananda Speciality Hospital", type: "Multi-Speciality Hospital", beds: 260, status: "Active" },
    { name: "Prana Life Sciences Hospital", type: "Super-Speciality Hospital", beds: 520, status: "Active" },
    { name: "Aarogya City Hospital", type: "Multi-Speciality Hospital", beds: 310, status: "Active" },
    { name: "Sahyadri Health City", type: "Corporate Hospital", beds: 720, status: "Active" },
    { name: "Sunrise Medical Centre", type: "General Hospital", beds: 180, status: "Active" },
    { name: "Nova Care Hospital", type: "Multi-Speciality Hospital", beds: 240, status: "Active" },
    { name: "Trinity Nursing Home", type: "Nursing Home", beds: 120, status: "Active" },
    { name: "Lotus Diagnostic Centre", type: "Diagnostic Centre", beds: 90, status: "Active" },
    { name: "Dhanvantari Super Speciality", type: "Super-Speciality Hospital", beds: 450, status: "Active" },
    { name: "Granthi Primary Health Centre", type: "Government Hospital", beds: 150, status: "On Hold" },
    { name: "Orchid Women & Child Hospital", type: "Multi-Speciality Hospital", beds: 200, status: "Active" },
    { name: "Pranava General Hospital", type: "General Hospital", beds: 160, status: "Prospect" },
  ];

  HOSPITAL_BLUEPRINT.forEach((bp, idx) => {
    const loc = pick(CITIES);
    const id = `HSP-${String(idx + 1).padStart(3, "0")}`;
    const onboarded = addDays(TODAY, -randInt(120, 1100));
    const categories = pickN(
      ["Consultant Physician", "Specialist Doctor", "Resident Doctor", "Medical Officer", "Nursing Staff", "Paramedical Staff", "Allied Health Staff"] as StaffingCategory[],
      randInt(2, 4)
    );
    hospitals.push({
      id,
      name: bp.name,
      type: bp.type,
      registrationNo: regNum("HFR"),
      registrationAuthority: `${loc.state} Health Registration Authority (demo record)`,
      contactPerson: fullName(),
      hrManager: fullName(),
      medicalSuperintendent: `Dr. ${fullName()}`,
      email: `hr@${bp.name.toLowerCase().replace(/[^a-z]+/g, "")}.demo`,
      phone: `+91 8${randInt(100000000, 999999999)}`.slice(0, 17),
      address: `${randInt(1, 240)}, ${pick(["MG Road", "Lake View Road", "Park Street", "Sector 21", "Civil Lines", "Nehru Nagar", "Residency Road"])}`,
      city: loc.city,
      state: loc.state,
      pincode: String(randInt(110000, 799999)),
      beds: bp.beds,
      requiredCategories: categories,
      accountManagerId: chance(0.7) ? businessAdmin.id : pick(users).id,
      contractStatus: bp.status === "On Hold" ? "Expired" : chance(0.18) ? "Expiring Soon" : "Active",
      paymentTerms: pick(["Net 15", "Net 30", "Net 45", "Net 60"] as const),
      clientStatus: bp.status,
      onboardedAt: toISO(onboarded),
      notes: bp.status === "Prospect" ? "Prospect onboarded through lead conversion; contract drafting in progress." : "Fictional demo client record.",
      archived: false,
      createdAt: toISO(onboarded),
    });

    hospitalContacts.push(
      {
        id: `HCT-${String(idx + 1).padStart(3, "0")}-1`,
        hospitalId: id,
        name: fullName(),
        designation: "Head of Human Resources",
        email: `hr.manager@${bp.name.toLowerCase().replace(/[^a-z]+/g, "")}.demo`,
        phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
        isPrimary: true,
      },
      {
        id: `HCT-${String(idx + 1).padStart(3, "0")}-2`,
        hospitalId: id,
        name: `Dr. ${fullName()}`,
        designation: "Medical Superintendent",
        email: `ms@${bp.name.toLowerCase().replace(/[^a-z]+/g, "")}.demo`,
        phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
        isPrimary: false,
      },
      {
        id: `HCT-${String(idx + 1).padStart(3, "0")}-3`,
        hospitalId: id,
        name: fullName(),
        designation: "Billing & Accounts Executive",
        email: `accounts@${bp.name.toLowerCase().replace(/[^a-z]+/g, "")}.demo`,
        phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
        isPrimary: false,
      }
    );
  });

  const activeHospitals = hospitals.filter((h) => h.clientStatus === "Active");

  /* ---------------- Contracts ---------------- */
  const contracts: Contract[] = [];
  const contractRates: Database["contractRates"] = [];
  let contractSeq = 0;
  activeHospitals.forEach((h, i) => {
    if (i > 9) return; // only the first 10 hospitals get a seeded contract
    contractSeq += 1;
    const start = addDays(TODAY, -randInt(150, 700));
    // The first three agreements are deliberately placed inside the renewal
    // window so the renewal workflow always has live records to act on.
    const end = contractSeq <= 3 ? addDays(TODAY, randInt(6, 44)) : addDays(start, randInt(700, 1400));    const id = `CTR-${String(contractSeq).padStart(3, "0")}`;
    const status = end < TODAY ? "Expired" : addDays(end, -45) < TODAY ? "Expiring Soon" : "Active";
    contracts.push({
      id,
      number: `MST-CTR-${start.getFullYear()}-${String(contractSeq).padStart(4, "0")}`,
      title: `${h.name} — Clinical Staffing Services Agreement`,
      hospitalId: h.id,
      startDate: toISO(start),
      endDate: toISO(end),
      billingModel: pick(["Per Doctor Per Month", "Per Doctor Per Month", "Per Doctor Per Month", "Per Shift"] as const),
      categories: h.requiredCategories,
      replacementTerms: "Replacement doctor provided within 72 hours of written notice; zero billing for uncovered shifts.",
      paymentTerms: h.paymentTerms,
      status,
      signedByHospital: h.contactPerson,
      signedByCompany: superAdmin.name,
      signedAt: toISO(addDays(start, -9)),
      notes: "Fictional demo contract. Not a legally binding document.",
      createdAt: toISO(start),
    });
    h.requiredCategories.forEach((cat) => {
      pickN(DESIGNATIONS[cat], Math.min(2, DESIGNATIONS[cat].length)).forEach((desig) => {
        const base = cat === "Consultant Physician" ? randInt(145000, 245000) : cat === "Nursing Staff" ? randInt(32000, 62000) : randInt(55000, 135000);
        contractRates.push({
          id: `CRT-${contractSeq}-${contractRates.length + 1}`,
          contractId: id,
          category: cat,
          designation: desig,
          rate: round0(base),
          unit: "Per Doctor / Month",
        });
      });
    });
  });

  /* ---------------- Employees (doctors + internal) ---------------- */
  const employees: Employee[] = [];
  const salaryStructures: SalaryStructure[] = [];
  const docEmployees: Employee[] = [];
  let empSeq = 0;

  for (let i = 0; i < 50; i++) {
    empSeq += 1;
    const id = `EMP-${String(empSeq).padStart(4, "0")}`;
    const cat = pick(["Consultant Physician", "Specialist Doctor", "Resident Doctor", "Medical Officer", "Nursing Staff", "Paramedical Staff", "Allied Health Staff"] as StaffingCategory[]);
    const desig = pick(DESIGNATIONS[cat]);
    const loc = pick(CITIES);
    const joined = addDays(TODAY, -randInt(40, 1100));
    const exp = randInt(1, 24);
    const base =
      cat === "Consultant Physician" ? randInt(105000, 190000) :
      cat === "Specialist Doctor" ? randInt(70000, 125000) :
      cat === "Resident Doctor" ? randInt(45000, 75000) :
      cat === "Medical Officer" ? randInt(40000, 65000) :
      cat === "Nursing Staff" ? randInt(22000, 48000) :
      cat === "Paramedical Staff" ? randInt(18000, 35000) : randInt(25000, 45000);
    const ctc = round0(base * 1.24);

    const emp: Employee = {
      id,
      employeeCode: `MSX-DOC-${String(empSeq).padStart(4, "0")}`,
      name: `Dr. ${fullName()}`,
      email: `${id.toLowerCase()}@medistaffix.demo`,
      phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
      designation: desig,
      department: cat === "Nursing Staff" ? "Nursing" : "Clinical Staffing",
      employmentType: pick(["Full Time", "Full Time", "Full Time", "Contract", "Locum Tenens"] as const),
      dateOfJoining: toISO(joined),
      reportingManagerId: opsManager.id,
      employmentStatus: chance(0.05) ? "Resigned" : "Active",
      salaryStructureId: `SAL-${String(empSeq).padStart(4, "0")}`,
      bankDetails: {
        accountHolder: fullName(),
        bankName: pick(["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"]),
        accountNumberMasked: `XXXXXX${randInt(1000, 9999)}`,
        ifsc: `${pick(["HDFC", "ICIC", "SBIN", "UTIB", "KKBK"])}0${randInt(100000, 999999)}`,
        branch: `${loc.city} Main Branch`,
      },
      emergencyContactName: fullName(),
      emergencyContactPhone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
      address: `${randInt(1, 180)}, ${pick(["Ring Road", "Gandhi Street", "Model Town", "Ashok Nagar"])}`,
      city: loc.city,
      state: loc.state,
      archived: false,
      createdAt: toISO(joined),
      doctorProfile: {
        specialisation: pick(SPECIALISATIONS),
        categories: [cat],
        registrationCouncil: STATES_COUNCIL[loc.state],
        registrationNumber: regNum(loc.state.slice(0, 3).toUpperCase()),
        experienceYears: exp,
        skills: pickN(["ICU Care", "Emergency Response", "OPD Consulting", "Inpatient Rounds", "Procedure Documentation", "Patient Counselling", "Telemedicine", "ICU Ventilator Management", "Obstetric Care", "Paediatric Care", "Dialysis Support", "Operation Theatre Assistance"], randInt(3, 6)),
        languages: pickN(LANGUAGES, randInt(2, 4)),
        preferredShift: pick(["Day", "Night", "Rotational", "General"] as ShiftType[]),
      },
    };
    employees.push(emp);
    docEmployees.push(emp);

    salaryStructures.push({
      id: `SAL-${String(empSeq).padStart(4, "0")}`,
      employeeId: id,
      effectiveFrom: toISO(joined),
      ctc,
      basicPercent: 40,
      hraPercent: 20,
      specialAllowancePercent: 28,
      conveyancePercent: 12,
      professionalTaxEnabled: true,
      professionalTaxAmount: 200,
      providentFundEnabled: true,
      providentFundPercent: 12,
      esiEnabled: ctc / 12 <= 21000,
      esiPercent: 0.75,
      tdsApplicable: ctc / 12 >= 25000,
      tdsPercent: ctc / 12 >= 100000 ? 10 : 0,
      revisionNote: "Initial appointment structure (demo record).",
      createdAt: toISO(joined),
    });
  }

  // Internal team employees (recruiters, HR, finance, ops) — not deployable clinicians.
  INTERNAL_TEAM.forEach((spec, i) => {
    empSeq += 1;
    const id = `EMP-${String(empSeq).padStart(4, "0")}`;
    const user = users[i];
    const joined = addDays(TODAY, -randInt(200, 1200));
    const ctc = spec.role === "Super Admin" ? 420000 : randInt(700000, 1500000);
    employees.push({
      id,
      employeeCode: `MSX-ADM-${String(empSeq).padStart(4, "0")}`,
      name: spec.name,
      email: user.email,
      phone: user.phone,
      designation: spec.designation,
      department: spec.department,
      employmentType: "Full Time",
      dateOfJoining: toISO(joined),
      reportingManagerId: superAdmin.id,
      employmentStatus: "Active",
      salaryStructureId: `SAL-${String(empSeq).padStart(4, "0")}`,
      bankDetails: {
        accountHolder: spec.name,
        bankName: "HDFC Bank",
        accountNumberMasked: `XXXXXX${randInt(1000, 9999)}`,
        ifsc: `HDFC0${randInt(100000, 999999)}`,
        branch: "Bengaluru Main Branch",
      },
      emergencyContactName: fullName(),
      emergencyContactPhone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
      city: "Bengaluru",
      state: "Karnataka",
      archived: false,
      createdAt: toISO(joined),
    });
    salaryStructures.push({
      id: `SAL-${String(empSeq).padStart(4, "0")}`,
      employeeId: id,
      effectiveFrom: toISO(joined),
      ctc,
      basicPercent: 40,
      hraPercent: 20,
      specialAllowancePercent: 28,
      conveyancePercent: 12,
      professionalTaxEnabled: false,
      professionalTaxAmount: 0,
      providentFundEnabled: false,
      providentFundPercent: 0,
      esiEnabled: false,
      esiPercent: 0,
      tdsApplicable: true,
      tdsPercent: 10,
      revisionNote: "Corporate employee structure (demo record).",
      createdAt: toISO(joined),
    });
  });

  /* ---------------- Deployments ---------------- */
  const deployments: Deployment[] = [];
  let depSeq = 0;
  const shuffledDocs = [...docEmployees].sort(() => rand() - 0.5);
  /** Every deployment is placed at a hospital that actually has a contract. */
  const contractHospitals = activeHospitals.filter((h) => contracts.some((c) => c.hospitalId === h.id));
  const activeDocPool = shuffledDocs.filter((e) => e.employmentStatus === "Active");

  const makeDeployment = (emp: Employee, hospital: Hospital, requestedContract: Contract | undefined, status: Deployment["status"], start: Date, end: Date) => {
    depSeq += 1;
    const contract = requestedContract ?? contracts[0];
    const struct = salaryStructures.find((s) => s.employeeId === emp.id)!;
    const salary = round0((struct.ctc / 12) * 0.94);
    const contractRatesForHospital = contractRates.filter((r) => r.contractId === contract.id);
    const rate =
      contractRatesForHospital.find((r) => r.designation === emp.designation)?.rate ??
      contractRatesForHospital[0]?.rate ??
      round0(salary * 1.25);
    const d: Deployment = {
      id: `DEP-${String(depSeq).padStart(4, "0")}`,
      deploymentCode: `MSX-DEP-${String(depSeq).padStart(4, "0")}`,
      hospitalId: hospital.id,
      employeeId: emp.id,
      requisitionId: "",
      designation: emp.designation,
      startDate: toISO(start),
      endDate: toISO(end),
      shift: emp.doctorProfile?.preferredShift ?? "General",
      monthlySalary: salary,
      monthlyHospitalBilling: round0(rate * 1.12),
      status,
      reportingContact: hospital.hrManager,
      reportingContactPhone: hospital.phone,
      contractId: contract.id,
      replacementStatus: status === "Replaced" ? "Replaced" : "Not Required",
      notes: "Fictional demo deployment record.",
      createdAt: toISO(addDays(start, -12)),
    };
    deployments.push(d);
    return d;
  };

  // Active deployments. Every active doctor should be on a client hospital so
  // that twelve months of invoices cover the payroll book; otherwise the finance
  // views show implausible negative margins.
  const activeDeploymentCount = Math.min(activeDocPool.length - 12, 38);
  for (let i = 0; i < activeDeploymentCount; i++) {
    const emp = activeDocPool[i % activeDocPool.length];
    const hospital = contractHospitals[i % contractHospitals.length];
    const contract = contracts.find((c) => c.hospitalId === hospital.id);
    // Start dates spread across the full twelve-month billing window.
    const start = addDays(TODAY, -randInt(60, 700));
    const end = addDays(start, 730);
    makeDeployment(emp, hospital, contract, i === activeDeploymentCount - 1 ? "Confirmed" : "Active", start, end);
  }
  // 12 completed deployments, drawn from doctors not currently deployed.
  for (let i = 0; i < 12; i++) {
    const emp = activeDocPool[(activeDeploymentCount + i) % activeDocPool.length];
    const hospital = contractHospitals[(i + 3) % contractHospitals.length];
    const contract = contracts.find((c) => c.hospitalId === hospital.id);
    const start = addDays(TODAY, -randInt(400, 900));
    const end = addDays(start, randInt(120, 360));
    makeDeployment(emp, hospital, contract, "Completed", start, end);
  }
  // 6 pipeline deployments awaiting client confirmation, so the allocation
  // workflow (propose → allocate → confirm) always has live work queued.
  for (let i = 0; i < 6; i++) {
    const emp = activeDocPool[(activeDeploymentCount + 12 + i) % activeDocPool.length];
    const hospital = contractHospitals[(i + 7) % contractHospitals.length];
    const contract = contracts.find((c) => c.hospitalId === hospital.id);
    const start = addDays(TODAY, randInt(5, 40));
    const end = addDays(start, 730);
    makeDeployment(emp, hospital, contract, i % 2 === 0 ? "Allocated" : "Proposed", start, end);
  }

  /* ---------------- Requirements & Requisitions ---------------- */
  const requirements: HospitalRequirement[] = [];
  const requisitions: JobRequisition[] = [];
  let reqSeq = 0, jobSeq = 0;

  activeHospitals.slice(0, 11).forEach((h) => {
    const count = h.id.charCodeAt(h.id.length - 1) % 3 === 0 ? 3 : 2;
    for (let k = 0; k < count; k++) {
      const cat = pick(h.requiredCategories);
      const desig = pick(DESIGNATIONS[cat]);
      const allocatedCount = chance(0.55) ? randInt(1, 2) : 0;
      reqSeq += 1;
      const rid = `REQ-${String(reqSeq).padStart(4, "0")}`;
      const target = addDays(TODAY, randInt(10, 75));
      requirements.push({
        id: rid,
        referenceNo: `HOS-REQ-${String(reqSeq).padStart(4, "0")}`,
        hospitalId: h.id,
        category: cat,
        designation: desig,
        count: randInt(1, 4),
        allocated: allocatedCount,
        shiftRequirement: pick(["Day shift (8h)", "Night shift (8h)", "Rotational — day/night", "Full time with on-call", "Weekend only"]),
        minExperienceYears: randInt(0, 8),
        requiredQualification: pick(QUAL_SHORT),
        budgetPerDoctor: round0(randInt(40000, 180000)),
        priority: pick(["Critical", "High", "High", "Medium", "Low"] as const),
        status: allocatedCount > 0 ? "Partially Allocated" : "Open",
        requestedBy: h.hrManager,
        requestedAt: ts(-randInt(3, 60)),
        targetDate: toISO(target),
        notes: "Fictional demo staffing requirement.",
      });

      jobSeq += 1;
      requisitions.push({
        id: `JOB-${String(jobSeq).padStart(4, "0")}`,
        jobCode: `JOB-${String(jobSeq).padStart(4, "0")}`,
        hospitalId: h.id,
        designation: desig,
        category: cat,
        qualification: pick(QUALIFICATIONS),
        specialization: pick(SPECIALISATIONS),
        vacancies: randInt(1, 5),
        filled: allocatedCount,
        salaryBudget: round0(randInt(40000, 190000)),
        workLocation: `${h.city}, ${h.state}`,
        shiftRequirement: pick(["Day shift", "Night shift", "Rotational", "Flexible"]),
        contractDuration: pick(["6 months", "12 months", "24 months", "Ongoing retainer"]),
        joiningDeadline: toISO(addDays(TODAY, randInt(-10, 60))),
        priority: pick(["Critical", "High", "High", "Medium", "Low"] as const),
        status: allocatedCount >= 2 ? "Filled" : allocatedCount > 0 ? "Partially Filled" : chance(0.9) ? "Open" : "On Hold",
        hiringManagerId: h.hrManager,
        recruiterId: pick(recruiters).id,
        createdAt: ts(-randInt(3, 70)),
      });
    }
  });

  // Link deployments back to a matching requisition where possible.
  deployments.forEach((d) => {
    const job = requisitions.find(
      (j) => j.hospitalId === d.hospitalId && j.designation === d.designation
    );
    if (job) d.requisitionId = job.id;
  });

  /* ---------------- Candidates & Applications ---------------- */
  const candidates: Candidate[] = [];
  const applications: JobApplication[] = [];
  const interviews: Interview[] = [];
  const offers: Offer[] = [];
  let candSeq = 0, appSeq = 0, intSeq = 0, offerSeq = 0;

  const makeCandidate = (stage: CandidateStage, source: Candidate["source"] = pick(["Referral", "Website", "LinkedIn", "Cold Call", "Existing Client", "Hospital Association", "Trade Event", "Email Campaign"])): Candidate => {
    candSeq += 1;
    const loc = pick(CITIES);
    const name = `Dr. ${fullName()}`;
    const exp = randInt(0, 22);
    const id = `CAN-${String(candSeq).padStart(4, "0")}`;
    const c: Candidate = {
      id,
      candidateCode: `CAND-${String(candSeq).padStart(4, "0")}`,
      name,
      mobile: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
      email: `candidate${candSeq}@medistaffix.demo`,
      qualification: pick(QUALIFICATIONS),
      specialization: pick(SPECIALISATIONS),
      registrationNumber: regNum(loc.state.slice(0, 3).toUpperCase()),
      stateCouncil: STATES_COUNCIL[loc.state],
      experienceYears: exp,
      expectedSalary: round0(randInt(28000, 210000)),
      preferredLocation: `${loc.city}, ${loc.state}`,
      currentLocation: `${loc.city}, ${loc.state}`,
      availability: pick(["Immediate", "15 days", "30 days", "45 days", "60 days"]),
      stage,
      status: stage === "Joined" ? "Placed" : stage === "Rejected" ? "Rejected" : "Active",
      verificationStatus:
        stage === "Joined" ? "Verified (Demo Record)" :
        stage === "Rejected" ? pick(["Discrepancy Found", "Rejected"] as const) :
        pick(["Not Initiated", "Documents Submitted", "In Verification", "Verified (Demo Record)"] as const),
      source,
      noticePeriodDays: pick([0, 15, 30, 60, 90]),
      rating: Math.round((3 + rand() * 2) * 10) / 10,
      summary: `Fictional candidate profile generated for the MediStaffix demonstration environment. ${exp} years of experience across ${pick(SPECIALISATIONS)}.`,
      createdAt: ts(-randInt(2, 180)),
      updatedAt: ts(-randInt(0, 20)),
      documents: [
        { id: `CD-${candSeq}-1`, candidateId: id, type: "Resume", name: `${name.replace(/^Dr\. /, "").replace(/ /g, "_")}_CV.pdf`, uploadedAt: ts(-randInt(2, 150)), status: "Accepted", simulated: true },
        { id: `CD-${candSeq}-2`, candidateId: id, type: "Medical Registration", name: `State_Medical_Council_Certificate.pdf`, uploadedAt: ts(-randInt(2, 150)), status: pick(["Uploaded", "Under Review", "Accepted"] as const), simulated: true },
        { id: `CD-${candSeq}-3`, candidateId: id, type: "Degree Certificate", name: `Post_Graduation_Degree.pdf`, uploadedAt: ts(-randInt(2, 150)), status: pick(["Uploaded", "Under Review", "Accepted"] as const), simulated: true },
      ],
    };
    candidates.push(c);
    return c;
  };

  // 20 extra candidates not yet attached to a requisition
  for (let i = 0; i < 20; i++) makeCandidate(pick(["Applied", "Applied", "Screening"] as CandidateStage[]));

  const openJobs = requisitions.filter((j) => j.status !== "Closed");
  const targetApplications = 100;
  const stagePool: CandidateStage[] = [
    "Applied", "Screening", "Shortlisted", "Interview Scheduled", "Interview Completed",
    "Selected", "Offer Released", "Joined", "Rejected", "Rejected",
  ];
  for (let i = 0; i < targetApplications; i++) {
    const job = pick(openJobs);
    const stage = pick(stagePool);
    const cand = makeCandidate(stage);
    appSeq += 1;
    const app: JobApplication = {
      id: `APP-${String(appSeq).padStart(4, "0")}`,
      requisitionId: job.id,
      candidateId: cand.id,
      appliedAt: ts(-randInt(1, 120)),
      stage,
      source: cand.source,
      hospitalFitScore: randInt(45, 98),
      recruiterNotes: stage === "Rejected" ? pick(["Did not meet experience criteria", "Withdrew after offer discussion", "Documents incomplete", "Better fit for a different role"]) : pick(["Profile matches requirement", "Strong clinical background", "Awaiting credential verification", "Recommended by referrer"]),
      updatedAt: ts(-randInt(0, 30)),
    };
    if (stage === "Rejected") app.rejectedReason = app.recruiterNotes;
    applications.push(app);

    if (["Interview Scheduled", "Interview Completed", "Selected", "Offer Released", "Joined"].includes(stage)) {
      intSeq += 1;
      const scheduled = addDays(TODAY, stage === "Interview Scheduled" ? randInt(0, 6) : -randInt(1, 60));
      interviews.push({
        id: `INT-${String(intSeq).padStart(4, "0")}`,
        applicationId: app.id,
        candidateId: cand.id,
        requisitionId: job.id,
        round: randInt(1, 3),
        scheduledAt: `${toISO(scheduled)}T${String(randInt(9, 17)).padStart(2, "0")}:${pick(["00", "30"])}:00.000Z`,
        mode: pick(["In Person", "Video Call", "Panel", "Phone"] as const),
        interviewers: pickN([hrManager.name, businessAdmin.name, opsManager.name, "Panel Member 4", "Panel Member 5"], randInt(1, 3)),
        status: stage === "Interview Scheduled" ? "Scheduled" : "Completed",
        result: stage === "Interview Completed" ? "Recommended" : stage === "Selected" || stage === "Offer Released" || stage === "Joined" ? "Strongly Recommended" : "Pending",
        scorecard: [
          { competency: "Clinical Competence", rating: randInt(3, 5), notes: "Demonstrated strong diagnostic reasoning." },
          { competency: "Patient Communication", rating: randInt(3, 5), notes: "Clear and empathetic communication style." },
          { competency: "Shift Reliability", rating: randInt(2, 5), notes: "Comfortable with rotational and night duties." },
        ],
        feedback: stage === "Interview Scheduled" ? undefined : pick(["Recommended for the next round.", "Strong profile, proceed with offer.", "Meets all panel criteria.", "Cleared with a note on documentation."]),
      });
    }
    if (["Offer Released", "Joined"].includes(stage)) {
      offerSeq += 1;
      const ctc = round0(randInt(480000, 2400000));
      offers.push({
        id: `OFR-${String(offerSeq).padStart(4, "0")}`,
        offerCode: `OFR-${TODAY.getFullYear()}-${String(offerSeq).padStart(4, "0")}`,
        applicationId: app.id,
        candidateId: cand.id,
        requisitionId: job.id,
        issuedAt: ts(-randInt(1, 45)),
        joiningDate: toISO(addDays(TODAY, randInt(-30, 25))),
        expiresAt: toISO(addDays(TODAY, randInt(2, 20))),
        annualCtc: ctc,
        fixedSalary: round0(ctc * 0.88),
        variablePay: round0(ctc * 0.12),
        status: stage === "Joined" ? "Accepted" : pick(["Released", "Accepted"] as const),
        notes: "Offer generated from a MediStaffix document template (demo record).",
        respondedAt: ts(-randInt(0, 40)),
      });
    }
  }

  // Link a few joined candidates to real employees so onboarding is traceable.
  const joinedApps = applications.filter((a) => a.stage === "Joined").slice(0, 6);
  joinedApps.forEach((app) => {
    const emp = employees[randInt(60, 62)] ?? employees[docEmployees.length - 1];
    const cand = candidates.find((c) => c.id === app.candidateId);
    if (cand && emp.doctorProfile) {
      emp.doctorProfile.candidateId = cand.id;
      emp.name = cand.name;
    }
  });

  /* ---------------- Leads ---------------- */
  const leads: Lead[] = [];
  const leadActivities: LeadActivity[] = [];
  const opportunities: Opportunity[] = [];
  let leadSeq = 0;
  const LEAD_ORGS = [
    "Helix Care Hospitals", "Blue Lotus Hospital", "Sparsh Multispeciality", "Orbit Health City",
    "Kaveri Medical Center", "Unity Care Hospital", "Southern Health Park", "Coastal Care Hospital",
    "Silver Oak Medical Center", "Pinnacle Health Group",
  ];
  const STAGE_WEIGHTS: [Lead["stage"], number][] = [
    ["New", 5], ["Contacted", 4], ["Qualified", 3], ["Proposal Sent", 2], ["Negotiation", 2], ["Won", 2], ["Lost", 2],
  ];
  const weightedStage = (): Lead["stage"] => {
    const total = STAGE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [s, w] of STAGE_WEIGHTS) {
      r -= w;
      if (r <= 0) return s;
    }
    return "New";
  };
  for (let i = 0; i < 20; i++) {
    leadSeq += 1;
    const stage = weightedStage();
    const id = `LEAD-${String(leadSeq).padStart(3, "0")}`;
    const created = addDays(TODAY, -randInt(2, 200));
    const lead: Lead = {
      id,
      name: `${pick(LEAD_ORGS)} — ${pick(["Staffing Requirement", "Bulk Doctor Supply", "Nursing Staff Contract", "Retainer Discussion", "ICU Staffing"])}`,
      organization: `${pick(LEAD_ORGS)}${chance(0.4) ? " " + pick(["Campus", "Annexe", "Institute"]) : ""}`,
      contactPerson: fullName(),
      phone: `+91 9${randInt(10000, 99999)}${randInt(10000, 99999)}`,
      email: `procurement${leadSeq}@lead.demo`,
      source: pick(["Referral", "Website", "Cold Call", "LinkedIn", "Trade Event", "Existing Client", "Email Campaign", "Hospital Association"]),
      interestedCategories: pickN(["Consultant Physician", "Specialist Doctor", "Resident Doctor", "Nursing Staff", "Paramedical Staff", "Medical Officer"] as StaffingCategory[], randInt(1, 3)),
      estimatedMonthlyValue: round0(randInt(180000, 2400000)),
      stage,
      assignedToId: chance(0.6) ? businessAdmin.id : pick(users).id,
      nextFollowUp: toISO(addDays(TODAY, randInt(-4, 20))),
      probability: { New: 10, Contacted: 25, Qualified: 45, "Proposal Sent": 60, Negotiation: 80, Won: 100, Lost: 0 }[stage],
      notes: "Fictional demo lead record.",
      createdAt: toISO(created),
      updatedAt: toISO(addDays(TODAY, -randInt(0, 20))),
    };
    if (stage === "Won" && hospitals.length < 40) {
      const h = hospitals[leadSeq % hospitals.length];
      lead.convertedHospitalId = h.id;
    }
    leads.push(lead);

    for (let a = 0; a < randInt(1, 4); a++) {
      leadActivities.push({
        id: `LAC-${leadSeq}-${a + 1}`,
        leadId: id,
        type: pick(["Call", "Email", "Meeting", "Note", "Site Visit", "Proposal"]),
        summary: pick(["Introductory call completed", "Requirement shared over email", "On-site walkthrough of facility", "Proposal walkthrough with management", "Follow-up on pending approvals", "Introduced account manager"]),
        details: "Simulated communication log entry created in the demo environment. No email, SMS or call was dispatched.",
        performedById: lead.assignedToId,
        performedAt: ts(-randInt(0, 40), randInt(9, 18)),
        simulated: true,
      });
    }

    if (["Qualified", "Proposal Sent", "Negotiation", "Won"].includes(stage)) {
      opportunities.push({
        id: `OPP-${String(leadSeq).padStart(3, "0")}`,
        name: `${lead.organization} — ${lead.interestedCategories[0]} staffing`,
        hospitalId: hospitals[leadSeq % hospitals.length].id,
        leadId: id,
        value: lead.estimatedMonthlyValue,
        probability: lead.probability,
        expectedCloseDate: toISO(addDays(TODAY, randInt(-20, 90))),
        stage,
        staffingCategories: lead.interestedCategories,
        headcount: randInt(4, 40),
        ownerId: lead.assignedToId,
        createdAt: toISO(created),
      });
    }
  }

  /* ---------------- Follow-ups ---------------- */
  const followUps: FollowUp[] = [];
  for (let i = 0; i < 24; i++) {
    const relType = pick(["Lead", "Hospital", "Candidate", "Contract", "Requisition", "Service Request"] as const);
    const pool: { id: string }[] =
      relType === "Lead" ? leads :
      relType === "Hospital" ? hospitals :
      relType === "Candidate" ? candidates :
      relType === "Contract" ? contracts :
      relType === "Requisition" ? requisitions : [];
    const rel = pool.length ? pick(pool) : leads[0];
    const dueOffset = randInt(-12, 18);
    followUps.push({
      id: `FUP-${String(i + 1).padStart(3, "0")}`,
      subject: pick(["Confirm monthly headcount plan", "Follow up on pending credential verification", "Discuss contract renewal terms", "Schedule interview panel", "Reconcile outstanding invoice", "Collect attendance data for billing", "Share replacement doctor profile"]),
      relatedType: relType,
      relatedId: rel.id,
      dueAt: toISO(addDays(TODAY, dueOffset)),
      ownerId: pick(users).id,
      priority: pick(["High", "Medium", "Low"] as const),
      notes: "Fictional demo follow-up.",
      status: dueOffset < 0 ? (chance(0.5) ? "Pending" : "Completed") : "Pending",
      completedAt: dueOffset < 0 && chance(0.5) ? toISO(addDays(TODAY, dueOffset + 1)) : undefined,
    });
  }

  /* ---------------- Shifts & Attendance ---------------- */
  const shifts: Shift[] = [];
  const attendance: Attendance[] = [];
  let shiftSeq = 0, attSeq = 0;
  const activeDeployments = deployments.filter((d) => d.status === "Active" || d.status === "Confirmed");

  // Two rolling months of rosters so payroll, billing and analytics have real inputs.
  for (let mOffset = -1; mOffset <= 0; mOffset++) {
    const ms = monthStart(mOffset);
    const days = mOffset === 0 ? TODAY.getDate() : daysInMonth(ms.getFullYear(), ms.getMonth());
    activeDeployments.forEach((dep) => {
      for (let day = 1; day <= days; day++) {
        const date = toISO(new Date(ms.getFullYear(), ms.getMonth(), day));
        const dow = new Date(ms.getFullYear(), ms.getMonth(), day).getDay();
        if (dow === 0 && chance(0.35)) continue;
        if (dow === 6 && chance(0.7)) continue;
        if (dep.startDate > date) continue;
        if (dep.endDate < date) continue;
        shiftSeq += 1;
        const type: ShiftType = dep.shift === "Rotational" ? (dow % 2 === 0 ? "Day" : "Night") : dep.shift;
        const shiftStart = type === "Night" ? "20:00" : type === "Day" ? "08:00" : "09:00";
        const shiftEnd = type === "Night" ? "08:00" : type === "Day" ? "16:00" : "18:00";
        const shift: Shift = {
          id: `SFT-${String(shiftSeq).padStart(6, "0")}`,
          deploymentId: dep.id,
          hospitalId: dep.hospitalId,
          employeeId: dep.employeeId,
          date,
          startTime: shiftStart,
          endTime: shiftEnd,
          type,
          status: "Scheduled",
          notes: "",
        };
        shifts.push(shift);

        const r = rand();
        const status: AttendanceStatus =
          r > 0.965 ? "Absent" : r > 0.9 ? "Late" : r > 0.86 ? "Half Day" : dow === 0 ? "Weekly Off" : "Present";
        if (status === "Absent" || status === "Weekly Off") continue;
        attSeq += 1;
        const lateMin = status === "Late" ? randInt(11, 55) : randInt(0, 7);
        attendance.push({
          id: `ATT-${String(attSeq).padStart(6, "0")}`,
          employeeId: dep.employeeId,
          deploymentId: dep.id,
          hospitalId: dep.hospitalId,
          date,
          status,
          shiftId: shift.id,
          checkIn: type === "Night" ? `20:${String(randInt(0, 25)).padStart(2, "0")}` : `${shiftStart.slice(0, 3)}${String(lateMin).padStart(2, "0")}`,
          checkOut: type === "Night" ? "07:45" : status === "Half Day" ? "12:00" : shiftEnd,
          workedHours: status === "Half Day" ? 4 : 8,
          overtimeHours: chance(0.12) ? randInt(1, 4) : 0,
          lateMinutes: lateMin,
          correctionRequested: chance(0.03),
          correctionReason: chance(0.03) ? "Punch was missed due to emergency duty at another ward." : undefined,
          approvedBy: chance(0.6) ? hrManager.id : undefined,
          remarks: "",
        });
      }
    });
  }

  /* ---------------- Leave ---------------- */
  const leaveRequests: LeaveRequest[] = [];
  const leaveBalances: LeaveBalance[] = [];
  const leaveAllEmployees = [...docEmployees, ...employees.filter((e) => !e.doctorProfile)];
  leaveAllEmployees.forEach((e) => {
    leaveBalances.push({
      employeeId: e.id,
      year: TODAY.getFullYear(),
      casual: randInt(2, 12),
      sick: randInt(4, 12),
      earned: randInt(3, 18),
      unpaid: 0,
      compensatory: randInt(0, 6),
    });
    const n = randInt(0, 2);
    for (let i = 0; i < n; i++) {
      const from = addDays(TODAY, randInt(-90, 30));
      const days = randInt(1, 4);
      const status = pick(["Pending", "Approved", "Approved", "Rejected", "Cancelled"] as const);
      leaveRequests.push({
        id: `LVR-${String(leaveRequests.length + 1).padStart(4, "0")}`,
        employeeId: e.id,
        type: pick(["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave", "Compensatory Off"]),
        fromDate: toISO(from),
        toDate: toISO(addDays(from, days - 1)),
        days,
        reason: pick(["Family function", "Medical appointment and follow-up", "Personal work", "Fever and recovery", "Travel out of station", "Child care"]),
        status,
        appliedAt: toISO(addDays(from, -randInt(2, 10))),
        approverId: status === "Pending" ? undefined : opsManager.id,
        decidedAt: status === "Pending" ? undefined : toISO(addDays(from, -1)),
        decisionNote: status === "Rejected" ? "Insufficient leave balance / deployment coverage not available." : undefined,
      });
    }
  });

  /* ---------------- Payroll (12 months) ---------------- */
  const payrollRuns: PayrollRun[] = [];
  const payrollItems: PayrollItem[] = [];
  const payslips: Payslip[] = [];
  const STAT = statutoryDefaults();

  for (let mOffset = -11; mOffset <= 0; mOffset++) {
    const period = periodOf(mOffset);
    const ms = monthStart(mOffset);
    const dim = daysInMonth(ms.getFullYear(), ms.getMonth());
    const isCurrent = mOffset === 0;
    const runId = `PR-${period.replace("-", "")}`;
    const runEmployees = leaveAllEmployees.filter((e) => e.dateOfJoining <= toISO(monthEnd(mOffset)) && e.employmentStatus !== "Terminated");
    let tg = 0, td = 0, tn = 0;

    runEmployees.forEach((e) => {
      const struct = salaryStructures.find((s) => s.employeeId === e.id);
      if (!struct) return;
      const dep = deployments.find((d) => d.employeeId === e.id && d.startDate <= toISO(monthEnd(mOffset)) && d.endDate >= toISO(monthStart(mOffset)));
      const g = statFromAttendance(attendance, shifts, e.id, period, dim);
      const payable = Math.max(0, dim - g.weekend);
      const lop = g.absent + g.half;
      const daily = struct.ctc / 12 / dim;
      const full = round0(struct.ctc / 12);
      const lopCost = daily * lop;
      const overtimeBase = (full / dim / 8) * g.overtime * STAT.overtimeMultiplier;
      const earned = round0(Math.max(0, full - lopCost + overtimeBase));
      const basic = round0(earned * (struct.basicPercent / 100));
      const hra = round0(earned * (struct.hraPercent / 100));
      const special = round0(earned * (struct.specialAllowancePercent / 100));
      const conveyance = round0(earned * (struct.conveyancePercent / 100));
      const incentives = chance(0.35) ? round0(randInt(1500, 14000)) : 0;
      const overtimeAmount = round0(overtimeBase);
      const arrears = chance(0.08) ? round0(randInt(2000, 12000)) : 0;
      const reimbursements = chance(0.12) ? round0(randInt(800, 5000)) : 0;
      const ptax = struct.professionalTaxEnabled && struct.professionalTaxAmount > 0 ? struct.professionalTaxAmount : 0;
      const pf = struct.providentFundEnabled ? round0(basic * (struct.providentFundPercent / 100)) : 0;
      const esi = struct.esiEnabled ? round0(earned * (struct.esiPercent / 100)) : 0;
      const tds = struct.tdsApplicable && struct.tdsPercent > 0 ? round0((earned + incentives) * (struct.tdsPercent / 100)) : 0;
      const otherDed = chance(0.07) ? round0(randInt(500, 3500)) : 0;
      const advanceRecovery = chance(0.05) ? round0(randInt(1000, 6000)) : 0;
      const gross = round0(basic + hra + special + conveyance + incentives + overtimeAmount + arrears + reimbursements);
      const totalDed = round0(ptax + pf + esi + tds + otherDed + advanceRecovery);
      const net = round0(gross - totalDed);

      payrollItems.push({
        id: `PI-${runId}-${e.id}`,
        runId,
        employeeId: e.id,
        deploymentId: dep?.id,
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
        otherDeductions: otherDed,
        advanceRecovery,
        grossEarnings: gross,
        totalDeductions: totalDed,
        netSalary: net,
        payableDays: payable,
        lossOfPayDays: lop,
        remarks: lop > 0 ? `Loss of pay for ${lop} day(s)` : "",
      });
      tg += gross; td += totalDed; tn += net;
    });

    const status: PayrollRun["status"] = isCurrent ? "Under Review" : mOffset === -1 ? "Approved" : "Paid";
    const run: PayrollRun = {
      id: runId,
      period,
      label: `Payroll ${toISO(ms).slice(0, 7)}`,
      status,
      totalEmployees: runEmployees.length,
      totalGross: round0(tg),
      totalDeductions: round0(td),
      totalNet: round0(tn),
      preparedById: users[6].id,
      approvedById: status !== "Under Review" ? businessAdmin.id : undefined,
      preparedAt: ts(mOffset * 30, 18),
      approvedAt: status !== "Under Review" ? ts(mOffset * 30 + 1, 11) : undefined,
      finalizedAt: status !== "Under Review" ? ts(mOffset * 30 + 2, 15) : undefined,
      paidAt: status === "Paid" ? ts(mOffset * 30 + 4, 12) : undefined,
      locked: status === "Paid",
      notes: isCurrent ? "Current period is open for review. Preview figures are indicative until attendance is finalised." : "Fictional demo payroll period.",
    };
    payrollRuns.push(run);

    if (status !== "Under Review") {
      runEmployees.forEach((e) => {
        const item = payrollItems.find((p) => p.runId === runId && p.employeeId === e.id);
        if (!item) return;
        payslips.push({
          id: `PSL-${runId}-${e.id}`,
          runId,
          itemId: item.id,
          employeeId: e.id,
          period,
          netSalary: item.netSalary,
          generatedAt: ts(mOffset * 30 + 2, 16),
        });
      });
    }
  }

  /* ---------------- Invoices & Payments ---------------- */
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let invSeq = 0, paySeq = 0;

  for (let mOffset = -11; mOffset <= 0; mOffset++) {
    const period = periodOf(mOffset);
    const invDate = monthEnd(mOffset);
    const me = monthEnd(mOffset);
    contracts
      .filter((c) => c.startDate <= toISO(me) && c.endDate >= toISO(invDate) && c.status !== "Expired")
      .forEach((contract) => {
        const hospital = hospitals.find((h) => h.id === contract.hospitalId)!;
        // Historic periods are always billed so twelve months of invoices exist;
        // the current month is sometimes still in draft preparation.
        if (mOffset > -3 && !chance(0.6)) return;
        invSeq += 1;
        const id = `INV-${period.replace("-", "")}-${String(invSeq).padStart(4, "0")}`;
        const dueOffset = contract.paymentTerms === "Net 15" ? 15 : contract.paymentTerms === "Net 30" ? 30 : contract.paymentTerms === "Net 45" ? 45 : 60;
        const items: Invoice["items"] = [];
        deployments
          .filter((d) => d.hospitalId === hospital.id && d.startDate <= toISO(me) && d.endDate >= toISO(invDate) && (d.status === "Active" || d.status === "Completed" || d.status === "Confirmed"))
          .forEach((d) => {
            const emp = employees.find((e) => e.id === d.employeeId)!;
            const monthShifts = shifts.filter((s) => s.deploymentId === d.id && s.date.startsWith(period));
            const worked = monthShifts.length || Math.round(daysInMonth(invDate.getFullYear(), invDate.getMonth()) * 0.78);
            const rate = contractRates.find((r) => r.contractId === contract.id && r.designation === d.designation)?.rate ?? d.monthlyHospitalBilling;
            items.push({
              id: `IVI-${id}-${items.length + 1}`,
              invoiceId: id,
              deploymentId: d.id,
              employeeId: d.employeeId,
              description: `${emp.name} — ${emp.designation} (${worked} approved duty days)`,
              category: emp.doctorProfile?.categories[0] ?? "Resident Doctor",
              shifts: worked,
              rate,
              amount: round0(rate * (worked / daysInMonth(invDate.getFullYear(), invDate.getMonth()))),
            });
          });
        if (!items.length) return;
        const subTotal = round0(items.reduce((s, i) => s + i.amount, 0));
        const svcPercent = 2.5;
        const svc = round0((subTotal * svcPercent) / 100);
        const taxPercent = 5;
        const tax = round0(((subTotal + svc) * taxPercent) / 100);
        const total = round0(subTotal + svc + tax);
        const due = addDays(invDate, dueOffset);
        const daysOverdue = Math.floor((TODAY.getTime() - due.getTime()) / 86400000);
        // A deliberate cohort of genuinely unpaid, past-due invoices keeps the
        // collections workflow and the overdue badge populated in the demo.
        const overdueUnpaid = daysOverdue > 0 && mOffset <= -2 && chance(0.16);
        let paid = 0;
        if (overdueUnpaid) paid = 0;
        else if (mOffset < -2) paid = chance(0.93) ? total : round0(total * randInt(30, 85) / 100);
        else if (mOffset === -2) paid = chance(0.6) ? total : round0(total * randInt(0, 70) / 100);
        else if (mOffset === -1) paid = chance(0.35) ? total : round0(total * randInt(0, 50) / 100);
        else paid = mOffset === 0 ? 0 : round0(total * randInt(0, 30) / 100);
        const outstanding = round0(total - paid);
        const status: Invoice["status"] =
          outstanding === 0 ? "Paid" :
          paid > 0 ? "Partially Paid" :
          daysOverdue > 0 ? "Overdue" :
          mOffset === 0 ? "Draft" : "Sent";
        const invoice: Invoice = {
          id,
          invoiceNo: `MST-INV-${period.replace("-", "")}-${String(invSeq).padStart(4, "0")}`,
          hospitalId: hospital.id,
          contractId: contract.id,
          billingPeriod: period,
          invoiceDate: toISO(invDate),
          dueDate: toISO(due),
          items,
          serviceChargePercent: svcPercent,
          serviceChargeAmount: svc,
          taxPercent,
          taxAmount: tax,
          totalAmount: total,
          amountPaid: paid,
          outstanding,
          status,
          approvedById: status === "Draft" ? undefined : financeManager.id,
          approvedAt: status === "Draft" ? undefined : toISO(addDays(invDate, 2)),
          sentAt: status === "Draft" ? undefined : toISO(addDays(invDate, 3)),
          notes: "Generated from active deployments and approved duty records. Fictional demo invoice.",
          createdAt: toISO(invDate),
        };
        invoices.push(invoice);

        if (paid > 0) {
          paySeq += 1;
          const instCount = paid < total ? 2 : 1;
          let remaining = paid;
          for (let p = 0; p < instCount; p++) {
            const amt = p === instCount - 1 ? remaining : round0(paid * randInt(35, 65) / 100);
            remaining -= amt;
            if (amt <= 0) continue;
            paySeq += 1;
            payments.push({
              id: `PAY-${String(paySeq).padStart(5, "0")}`,
              paymentNo: `RCPT-${period.replace("-", "")}-${String(paySeq).padStart(5, "0")}`,
              invoiceId: id,
              hospitalId: hospital.id,
              amount: amt,
              method: pick(["NEFT/RTGS", "NEFT/RTGS", "UPI", "Cheque", "Card"] as const),
              reference: `TXN${randInt(100000000, 999999999)}`,
              receivedOn: toISO(addDays(invDate, randInt(5, 60))),
              recordedById: financeManager.id,
              simulated: true,
              notes: "Simulated receipt recorded in the demo environment. No bank transfer was initiated.",
            });
          }
        }
      });
  }

  /* ---------------- Expenses ---------------- */
  const expenses: Expense[] = [];
  // Three recurring overhead claims per month across the full twelve-month
  // window, so the operating-surplus series never has a silent gap.
  const recurringTemplates: { category: ExpenseCategory; description: string; min: number; max: number }[] = [
    { category: "Office Expenses", description: "Monthly office rent and utilities", min: 185000, max: 205000 },
    { category: "Technology", description: "Software licences and cloud infrastructure", min: 64000, max: 96000 },
    { category: "Insurance", description: "Medical and paramedical staff insurance premium", min: 78000, max: 124000 },
  ];
  const monthsBack = (k: number) => {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 12);
    return d;
  };
  const planned: { category: ExpenseCategory; description: string; amount: number; date: Date; status: Expense["status"] }[] = [];
  for (let k = 0; k < 12; k++) {
    recurringTemplates.forEach((tpl, ti) => {
      planned.push({
        category: tpl.category,
        description: tpl.description,
        amount: round0(randInt(tpl.min, tpl.max)),
        date: monthsBack(k),
        // The current month is still accruing, so it is never yet approved.
        status: k === 0 ? "Under Review" : pick<Expense["status"]>(["Approved", "Approved", "Reimbursed"]),
      });
      void ti;
    });
  }
  for (let i = 0; i < 34; i++) {
    const cat = pick(["Recruitment", "Salaries", "Office Expenses", "Marketing", "Travel", "Technology", "Insurance", "Professional Fees", "Other Expenses"] as ExpenseCategory[]);
    planned.push({
      category: cat,
      description: pick([
        "Candidate travel and accommodation for interviews",
        "Recruitment portal subscription",
        "Professional consultancy and audit fees",
        "Brand advertising and trade event participation",
        "Staff transport and logistics",
        "Onboarding kits and medical equipment",
        "Statutory compliance and filing fees",
        "Medical equipment procurement for client hospitals",
      ]),
      amount:
        cat === "Salaries" ? round0(randInt(60000, 480000)) :
        cat === "Recruitment" ? round0(randInt(8000, 120000)) :
        cat === "Technology" ? round0(randInt(5000, 180000)) :
        cat === "Professional Fees" ? round0(randInt(15000, 220000)) :
        round0(randInt(1500, 65000)),
      date: addDays(TODAY, -randInt(1, 330)),
      status: pick<Expense["status"]>(["Approved", "Approved", "Approved", "Reimbursed", "Under Review", "Submitted", "Rejected"]),
    });
  }

  planned.sort((a, b) => a.date.getTime() - b.date.getTime()).forEach((p, i) => {
    const ed = p.date;
    const cat = p.category;
    const amount = p.amount;
    const status = p.status;
    const submitter = pick(users);
    expenses.push({
      id: `EXP-${String(i + 1).padStart(4, "0")}`,
      expenseNo: `MST-EXP-${ed.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      category: cat,
      description: p.description,
      amount,
      expenseDate: toISO(ed),
      submittedById: submitter.id,
      department: submitter.department,
      paymentMethod: pick(["NEFT/RTGS", "UPI", "Card", "Cheque"] as const),
      status,
      approvals: [
        { id: `EXA-${i + 1}-1`, expenseId: `EXP-${String(i + 1).padStart(4, "0")}`, approverId: submitter.id, action: "Submitted", note: "Submitted for approval.", at: toISO(addDays(ed, 1)) },
        ...(status === "Submitted" || status === "Draft" || status === "Under Review" ? [] : [
          { id: `EXA-${i + 1}-2`, expenseId: `EXP-${String(i + 1).padStart(4, "0")}`, approverId: financeManager.id, action: (status === "Rejected" ? "Rejected" : "Approved") as "Approved" | "Rejected", note: status === "Rejected" ? "Rejected — expense policy violation, resubmit with proper receipt." : "Verified against policy and approved.", at: toISO(addDays(ed, 3)) },
        ]),
      ],
      taxAmount: round0(amount * 0.18),
      vendor: `${pick(["MedSupply", "OfficeWorks", "TravelDesk", "CloudHost", "AdAgency", "AuditPartners", "InsureCare", "RecruitPro"])} ${pick(["Pvt Ltd", "LLP", "and Sons", "Solutions"])}`,
      createdAt: toISO(addDays(ed, 1)),
    });
  });

  const purchaseOrders: PurchaseOrder[] = [];
  for (let i = 0; i < 8; i++) {
    const qty = randInt(2, 40);
    const unitPrice = round0(randInt(500, 25000));
    purchaseOrders.push({
      id: `PO-${String(i + 1).padStart(4, "0")}`,
      poNo: `MST-PO-${String(i + 1).padStart(4, "0")}`,
      vendor: `${pick(["MedSupply", "OfficeWorks", "CloudHost", "UniformPro", "MedTech India"])} ${pick(["Pvt Ltd", "LLP"])}`,
      category: pick(["Technology", "Office Expenses", "Other Expenses", "Insurance"] as ExpenseCategory[]),
      description: pick(["Uniform and ID card kits for deployed staff", "Laptop and workstation refresh", "Cloud hosting annual plan", "Medical equipment consumables", "Office furniture for new branch"]),
      quantity: qty,
      unit: pick(["Units", "Sets", "Months", "Licences"]),
      unitPrice,
      totalAmount: round0(qty * unitPrice),
      status: pick(["Draft", "Pending Approval", "Approved", "Partially Received", "Received"] as const),
      raisedById: financeManager.id,
      expectedDate: toISO(addDays(TODAY, randInt(5, 90))),
      createdAt: ts(-randInt(5, 120)),
    });
  }

  /* ---------------- Service Requests ---------------- */
  const serviceRequests: ServiceRequest[] = [];
  for (let i = 0; i < 14; i++) {
    // Guarantee the first request per client hospital so no portal account
    // lands on an empty service desk.
    const ownedHospitals = new Set(serviceRequests.map((s) => s.hospitalId));
    const uncovered = contractHospitals.find((h) => !ownedHospitals.has(h.id));
    const dep = uncovered
      ? activeDeployments.find((d) => d.hospitalId === uncovered.id) ?? pick(activeDeployments)
      : pick(activeDeployments);
    const type = pick(["Replacement Request", "Transfer Request", "Escalation", "Attendance Issue", "Credential Update", "Billing Query", "Other"] as const);
    const created = addDays(TODAY, -randInt(0, 60));
    // The guaranteed coverage request for each hospital stays open so every
    // portal has live work; only the surplus requests are randomly resolved.
    const resolved = uncovered ? false : chance(0.45);
    serviceRequests.push({
      id: `SR-${String(i + 1).padStart(4, "0")}`,
      requestNo: `SR-2026-${String(i + 1).padStart(4, "0")}`,
      type,
      hospitalId: dep.hospitalId,
      deploymentId: type === "Billing Query" ? undefined : dep.id,
      employeeId: type === "Billing Query" ? undefined : dep.employeeId,
      subject: pick([
        "Immediate replacement for medical officer on leave",
        "Request to transfer consultant to day shift only",
        "Attendance marked absent but doctor was on duty",
        "Update medical registration details for credential file",
        "Query on invoice deduction for shortfall days",
        "Escalation — patient complaint regarding waiting time",
      ]),
      description: "Fictional demo service request raised by a hospital client through the client portal.",
      priority: pick(["Critical", "High", "Medium", "Low"] as const),
      status: resolved ? "Resolved" : pick(["Open", "Acknowledged", "In Progress"] as const),
      raisedById: businessAdmin.id,
      raisedByName: hospitals.find((h) => h.id === dep.hospitalId)!.hrManager,
      createdAt: toISO(created),
      resolvedAt: resolved ? toISO(addDays(created, randInt(1, 5))) : undefined,
      resolutionNote: resolved ? "Request addressed and closed. Fictional demo record." : undefined,
      slaHours: pick([4, 8, 24, 48, 72]),
    });
  }

  /* ---------------- Documents ---------------- */
  const documents: DocumentRecord[] = [];
  const addDoc = (d: Omit<DocumentRecord, "id" | "uploadedAt" | "simulated" | "status" | "accessRoles"> & Partial<Pick<DocumentRecord, "status" | "expiresAt">>) => {
    documents.push({
      ...d,
      id: `DOC-${String(documents.length + 1).padStart(5, "0")}`,
      uploadedAt: ts(-randInt(1, 400)),
      status: d.status ?? "Active",
      accessRoles: ["Super Admin", "Business Admin"],
      simulated: true,
    });
  };
  candidates.slice(0, 40).forEach((c) =>
    addDoc({ name: `${c.name.replace(/^Dr\. /, "").replace(/ /g, "_")}_Resume.pdf`, category: "Doctor Resume", ownerType: "Candidate", ownerId: c.id, fileName: `${c.candidateCode}_Resume.pdf`, mimeType: "application/pdf", sizeKb: randInt(120, 900), uploadedById: pick(recruiters).id, expiresAt: undefined })
  );
  candidates.slice(0, 30).forEach((c) =>
    addDoc({ name: `State_Medical_Council_${c.candidateCode}.pdf`, category: "Medical Registration Document", ownerType: "Candidate", ownerId: c.id, fileName: `${c.candidateCode}_Registration.pdf`, mimeType: "application/pdf", sizeKb: randInt(80, 400), uploadedById: pick(recruiters).id, expiresAt: toISO(addDays(TODAY, randInt(-20, 400))), status: chance(0.15) ? "Expiring Soon" : "Active" })
  );
  contracts.forEach((c) =>
    addDoc({ name: `${c.number}_Signed_Agreement.pdf`, category: "Hospital Contract", ownerType: "Contract", ownerId: c.id, fileName: `${c.number}.pdf`, mimeType: "application/pdf", sizeKb: randInt(400, 2400), uploadedById: businessAdmin.id, expiresAt: c.endDate, status: c.status === "Expired" ? "Expired" : c.status === "Expiring Soon" ? "Expiring Soon" : "Active" })
  );
  offers.slice(0, 20).forEach((o) =>
    addDoc({ name: `${o.offerCode}_Offer_Letter.pdf`, category: "Offer Letter", ownerType: "Candidate", ownerId: o.candidateId, fileName: `${o.offerCode}.pdf`, mimeType: "application/pdf", sizeKb: randInt(60, 220), uploadedById: pick(recruiters).id })
  );
  deployments.slice(0, 20).forEach((d) =>
    addDoc({ name: `${d.deploymentCode}_Deployment_Letter.pdf`, category: "Deployment Letter", ownerType: "Deployment", ownerId: d.id, fileName: `${d.deploymentCode}.pdf`, mimeType: "application/pdf", sizeKb: randInt(60, 200), uploadedById: opsManager.id, expiresAt: d.endDate })
  );
  invoices.slice(-30).forEach((i) =>
    addDoc({ name: `${i.invoiceNo}.pdf`, category: "Invoice", ownerType: "Invoice", ownerId: i.id, fileName: `${i.invoiceNo}.pdf`, mimeType: "application/pdf", sizeKb: randInt(80, 300), uploadedById: financeManager.id })
  );
  payslips.slice(-60).forEach((p) =>
    addDoc({ name: `Payslip_${p.period}_${p.employeeId}.pdf`, category: "Payslip", ownerType: "Employee", ownerId: p.employeeId, fileName: `Payslip_${p.period}_${p.employeeId}.pdf`, mimeType: "application/pdf", sizeKb: randInt(40, 120), uploadedById: users[6].id })
  );
  expenses.slice(0, 20).forEach((e) =>
    addDoc({ name: `${e.expenseNo}_Receipt.pdf`, category: "Expense Receipt", ownerType: "Expense", ownerId: e.id, fileName: `${e.expenseNo}.pdf`, mimeType: "application/pdf", sizeKb: randInt(50, 300), uploadedById: e.submittedById, expiresAt: undefined })
  );

  /* ---------------- Notifications ---------------- */
  const notifications: Notification[] = [];
  const pushNotif = (n: Omit<Notification, "id" | "readBy">) => notifications.push({ ...n, id: `NTF-${String(notifications.length + 1).padStart(4, "0")}`, readBy: [] });
  const hospitalName = (id: string) => hospitals.find((h) => h.id === id)?.name ?? "Hospital";
  contracts.filter((c) => c.status === "Expiring Soon").forEach((c) =>
    pushNotif({ title: "Contract expiring soon", body: `${hospitalName(c.hospitalId)} contract ${c.number} expires on ${c.endDate}.`, type: "Contract", severity: "Warning", link: "/crm/contracts", createdAt: ts(-randInt(0, 10)), audience: ["Super Admin", "Business Admin", "Finance Manager"] })
  );
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");
  overdueInvoices.slice(0, 6).forEach((i) =>
    pushNotif({ title: "Overdue payment", body: `Invoice ${i.invoiceNo} for ${hospitalName(i.hospitalId)} is overdue by ${Math.max(1, Math.floor((TODAY.getTime() - new Date(i.dueDate).getTime()) / 86400000))} days.`, type: "Payment", severity: "Critical", link: "/erp/invoices", createdAt: ts(-randInt(0, 6)), audience: ["Super Admin", "Business Admin", "Finance Manager"] })
  );
  const pendingLeave = leaveRequests.filter((l) => l.status === "Pending");
  pendingLeave.slice(0, 4).forEach((l) =>
    pushNotif({ title: "Leave approval pending", body: `${employees.find((e) => e.id === l.employeeId)?.name} applied for ${l.type} (${l.days} day(s)).`, type: "Approval", severity: "Info", link: "/workforce/leave", createdAt: ts(-randInt(0, 4)), audience: ["Super Admin", "HR Manager", "Operations Manager"] })
  );
  offers.filter((o) => o.status === "Released").slice(0, 4).forEach((o) =>
    pushNotif({ title: "Offer awaiting response", body: `Offer ${o.offerCode} for ${candidates.find((c) => c.id === o.candidateId)?.name} expires on ${o.expiresAt}.`, type: "Recruitment", severity: "Warning", link: "/recruitment/offers", createdAt: ts(-randInt(0, 5)), audience: ["Super Admin", "HR Manager", "Recruiter"] })
  );
  interviews.filter((i) => i.status === "Scheduled").slice(0, 5).forEach((i) =>
    pushNotif({ title: "Interview scheduled", body: `${candidates.find((c) => c.id === i.candidateId)?.name} — round ${i.round} on ${i.scheduledAt.slice(0, 10)}.`, type: "Recruitment", severity: "Info", link: "/recruitment/interviews", createdAt: ts(-randInt(0, 3)), audience: ["Super Admin", "HR Manager", "Recruiter"] })
  );
  pushNotif({ title: "Payroll awaiting approval", body: `Payroll for ${CURRENT_PERIOD} is under review with ${payrollRuns[payrollRuns.length - 1].totalEmployees} employees.`, type: "Payroll", severity: "Warning", link: "/payroll/salary-processing", createdAt: ts(-1, 9), audience: ["Super Admin", "Payroll Manager", "Business Admin"] });
  pushNotif({ title: "Open staffing requirements", body: `${requirements.filter((r) => r.status === "Open").length} hospital requirements are awaiting doctor allocation.`, type: "System", severity: "Info", link: "/operations/requirements", createdAt: ts(-1, 8), audience: ["Super Admin", "Operations Manager"] });
  pushNotif({ title: "Welcome to the MediStaffix demonstration", body: "All data in this environment is fictional and generated for demonstration purposes only.", type: "System", severity: "Info", link: "/dashboard", createdAt: ts(-2, 8), audience: "All" });

  /* ---------------- Activity & Audit ---------------- */
  const activityLogs: ActivityLog[] = [];
  const addActivity = (entity: string, entityId: string, hospitalId: string | undefined, type: string, summary: string, actorId: string, dayOffset = -randInt(0, 30)) => {
    activityLogs.push({ id: `ACT-${String(activityLogs.length + 1).padStart(5, "0")}`, at: ts(dayOffset, randInt(9, 19)), entity, entityId, hospitalId, type, summary, actorId });
  };
  deployments.filter((d) => d.status === "Active").forEach((d) =>
    addActivity("Deployment", d.id, d.hospitalId, "Deployment Active", `${employees.find((e) => e.id === d.employeeId)?.name} deployed as ${d.designation}.`, opsManager.id)
  );
  invoices.slice(-8).forEach((i) => addActivity("Invoice", i.id, i.hospitalId, "Invoice " + i.status, `Invoice ${i.invoiceNo} for ${i.billingPeriod} is ${i.status.toLowerCase()}.`, financeManager.id));
  candidates.slice(0, 10).forEach((c) => addActivity("Candidate", c.id, undefined, "Candidate Added", `${c.name} added to the candidate pool.`, pick(recruiters).id));
  leads.slice(0, 8).forEach((l) => addActivity("Lead", l.id, undefined, "Lead Updated", `Lead ${l.organization} moved to ${l.stage}.`, l.assignedToId));
  serviceRequests.slice(0, 6).forEach((s) => addActivity("Service Request", s.id, s.hospitalId, "Service Request " + s.status, `${s.requestNo}: ${s.subject}`, businessAdmin.id));
  activityLogs.sort((a, b) => (a.at < b.at ? 1 : -1));

  const auditLogs: AuditLog[] = [
    { id: "AUD-00001", at: ts(-2, 9, 12), actorId: superAdmin.id, actorName: superAdmin.name, actorRole: superAdmin.role, action: "SEED", entity: "Database", entityId: "SYSTEM", summary: "Demonstration dataset generated with fictional records.", ip: "127.0.0.1" },
    ...activityLogs.slice(0, 60).map((a, i): AuditLog => ({
      id: `AUD-${String(i + 2).padStart(5, "0")}`,
      at: a.at,
      actorId: a.actorId,
      actorName: users.find((u) => u.id === a.actorId)?.name ?? "System",
      actorRole: users.find((u) => u.id === a.actorId)?.role ?? "Super Admin",
      action: a.type.toUpperCase().replace(/\s+/g, "_"),
      entity: a.entity,
      entityId: a.entityId,
      summary: a.summary,
      ip: "127.0.0.1",
    })),
  ];

  /* ---------------- Portal users ---------------- */
  const portalHospital = hospitals[0];
  const clientUser: User = {
    id: "USR-011",
    name: portalHospital.hrManager,
    email: `client@${portalHospital.name.toLowerCase().replace(/[^a-z]+/g, "")}.demo`,
    role: "Hospital Client",
    department: "Client Services",
    phone: portalHospital.phone,
    passwordHint: DEMO_PASSWORD,
    status: "Active",
    avatarColor: AVATAR_COLORS[10],
    hospitalId: portalHospital.id,
    createdAt: toISO(addDays(TODAY, -200)),
  };
  /**
   * The doctor demo account must land on a doctor whose own portal has content:
   * an active deployment plus the shifts, attendance, leave and payslips that
   * go with it. Picking the first doctor in the array can otherwise select one
   * whose deployment has already completed, leaving every portal page empty.
   */
  const doctorPortalEmployee = (() => {
    const deployed = new Set(
      deployments.filter((d) => d.status === "Active" || d.status === "Confirmed").map((d) => d.employeeId)
    );
    return (
      docEmployees.find((e) => deployed.has(e.id) && shifts.some((s) => s.employeeId === e.id)) ??
      docEmployees.find((e) => deployed.has(e.id)) ??
      docEmployees[0]
    );
  })();
  const doctorUser: User = {
    id: "USR-012",
    name: doctorPortalEmployee.name,
    email: `doctor@medistaffix.demo`,
    role: "Doctor",
    department: "Clinical Staffing",
    phone: doctorPortalEmployee.phone,
    passwordHint: DEMO_PASSWORD,
    status: "Active",
    employeeId: doctorPortalEmployee.id,
    avatarColor: AVATAR_COLORS[11],
    createdAt: toISO(addDays(TODAY, -150)),
  };
  users.push(clientUser, doctorUser);

  const settings: Settings = {
    companyName: "MediStaffix Healthcare Services Pvt Ltd",
    tagline: "Connecting Healthcare Talent with Hospitals",
    supportEmail: "support@medistaffix.demo",
    supportPhone: "+91 80 4000 1200",
    registeredAddress: "4th Floor, Prestige Tech Park, Bengaluru, Karnataka 560103 (demo address)",
    gstin: "29AAECM1234M1Z5 (demo identifier)",
    statutory: STAT.config,
    defaultPaymentTerms: "Net 30",
    defaultInvoiceDueDays: 30,
    standardShiftHours: 8,
    overtimeRateMultiplier: 1.75,
    leavePolicy: {
      "Casual Leave": 12,
      "Sick Leave": 12,
      "Earned Leave": 15,
      "Unpaid Leave": 0,
      "Compensatory Off": 6,
    },
    documentExpiryAlertDays: 60,
    contractExpiryAlertDays: 45,
    demoMode: true,
    dataRetainedFrom: toISO(addMonths(TODAY, -12)),
  };

  return {
    users,
    hospitals,
    hospitalContacts,
    leads,
    leadActivities,
    followUps,
    opportunities,
    contracts,
    contractRates,
    candidates,
    requisitions,
    applications,
    interviews,
    offers,
    employees,
    salaryStructures,
    deployments,
    shifts,
    attendance,
    leaveRequests,
    leaveBalances,
    payrollRuns,
    payrollItems,
    payslips,
    invoices,
    payments,
    expenses,
    purchaseOrders,
    requirements,
    serviceRequests,
    documents,
    notifications,
    auditLogs,
    activityLogs,
    settings,
  };
}

/* ------------------------------------------------------------------ */
/* Statutory configuration (demo defaults, not legal advice)            */
/* ------------------------------------------------------------------ */

function statutoryDefaults() {
  return {
    config: {
      jurisdictionLabel: "India — demo configuration (not legal or tax advice)",
      currency: "INR",
      currencySymbol: "₹",
      professionalTax: {
        enabled: true,
        amountPerMonth: 200,
        note: "Professional tax slab varies by state and is configured per employee salary structure. Values here are illustrative.",
      },
      providentFund: {
        enabled: true,
        percent: 12,
        wageCeiling: 15000,
        note: "Employee and employer contribution percentages are configured per structure. Applicability and wage ceiling must be confirmed for the applicable jurisdiction.",
      },
      esi: {
        enabled: true,
        percent: 0.75,
        wageCeiling: 21000,
        note: "ESI applicability depends on wage threshold and establishment coverage. Configured illustratively.",
      },
      tds: {
        enabled: true,
        note: "TDS is applied only where the per-employee structure marks it applicable and the rate is set by the payroll manager. Rates are not asserted here.",
      },
      invoiceTax: {
        percent: 5,
        label: "GST (illustrative)",
        note: "Tax percentage is configurable per contract and must match the actual tax treatment of the supplied service.",
      },
      serviceCharge: {
        percent: 2.5,
        label: "Service & coordination charge",
        note: "Platform coordination charge applied to the taxable value of each invoice. Configurable in Settings.",
      },
      disclaimer:
        "All statutory components (professional tax, provident fund, ESI, TDS and invoice tax) are configurable placeholders in this demonstration. They are not a statement of applicable law, rates or obligations. Confirm requirements with a qualified professional before using this system for live payroll.",
    } satisfies Settings["statutory"],
    overtimeMultiplier: 1.75,
  };
}

function statFromAttendance(att: Attendance[], sft: Shift[], employeeId: string, period: string, dim: number) {
  const rows = att.filter((a) => a.employeeId === employeeId && a.date.startsWith(period));
  const monthShifts = sft.filter((s) => s.employeeId === employeeId && s.date.startsWith(period));
  const absent = rows.filter((r) => r.status === "Absent").length;
  const half = rows.filter((r) => r.status === "Half Day").length;
  const overtime = rows.reduce((s, r) => s + r.overtimeHours, 0);
  const scheduled = monthShifts.length || Math.round(dim * 0.78);
  const weekend = Math.max(0, scheduled - rows.length);
  return { absent, half, overtime: Math.round(overtime), weekend, present: rows.length };
}
