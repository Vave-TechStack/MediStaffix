import { readFileSync } from "fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const results = [];

const accounts = [
  ["Super Admin", "meera.raghavan@medistaffix.demo"],
  ["Business Admin", "aditya.kulkarni@medistaffix.demo"],
  ["HR Manager", "nandini.iyer@medistaffix.demo"],
  ["Recruiter", "faisal.khan@medistaffix.demo"],
  ["Payroll Manager", "priya.menon@medistaffix.demo"],
  ["Finance Manager", "vikram.shah@medistaffix.demo"],
  ["Operations Manager", "arun.prasad@medistaffix.demo"],
  ["Hospital Client", "client@astergrandmedicalcentre.demo"],
  ["Doctor", "doctor@medistaffix.demo"],
];

const pages = [
  "/dashboard",
  "/crm/hospitals", "/crm/leads", "/crm/contacts", "/crm/opportunities", "/crm/follow-ups", "/crm/contracts",
  "/recruitment/candidates", "/recruitment/requisitions", "/recruitment/applications", "/recruitment/interviews",
  "/recruitment/offers", "/recruitment/onboarding",
  "/workforce/doctor-directory", "/workforce/employees", "/workforce/deployment", "/workforce/shifts",
  "/workforce/attendance", "/workforce/leave",
  "/payroll/salary-processing", "/payroll/payslips", "/payroll/incentives", "/payroll/deductions", "/payroll/history",
  "/erp/invoices", "/erp/payments", "/erp/expenses", "/erp/purchase-orders", "/erp/finance",
  "/operations/requirements", "/operations/allocations", "/operations/shift-tracking",
  "/operations/replacements", "/operations/service-requests",
  "/analytics/reports", "/analytics/revenue", "/analytics/payroll-reports", "/analytics/recruitment",
  "/documents", "/settings", "/users",
];

const APIs = [
  "/api/hospitals?pageSize=5", "/api/leads?pageSize=5", "/api/candidates?pageSize=5",
  "/api/employees?pageSize=5", "/api/deployments?pageSize=5", "/api/invoices?pageSize=5",
  "/api/expenses?pageSize=5", "/api/contracts?pageSize=5", "/api/leave-requests?pageSize=5",
  "/api/shifts?pageSize=5", "/api/attendance?pageSize=5", "/api/service-requests?pageSize=5",
  "/api/payslips?pageSize=5", "/api/payroll-runs?pageSize=5", "/api/requisitions?pageSize=5",
  "/api/applications?pageSize=5", "/api/interviews?pageSize=5", "/api/offers?pageSize=5",
  "/api/documents?pageSize=5", "/api/users?pageSize=5", "/api/payments?pageSize=5",
  "/api/purchase-orders?pageSize=5", "/api/requirements?pageSize=5",
  "/api/followups?pageSize=5", "/api/opportunities?pageSize=5", "/api/contacts?pageSize=5",
  "/api/aggregate/dashboard", "/api/aggregate/finance", "/api/aggregate/recruitment",
  "/api/aggregate/operations", "/api/aggregate/doctors", "/api/aggregate/payroll-reports",
  "/api/search?q=hospital", "/api/notifications",
];

async function timed(url, opts = {}) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, redirect: "manual" });
    return { status: res.status, ms: Date.now() - started, headers: res.headers };
  } catch (e) {
    return { status: e.name === "AbortError" ? "TIMEOUT" : "ERR:" + e.message, ms: Date.now() - started, headers: null };
  } finally {
    clearTimeout(timer);
  }
}

const only = process.argv[2];

for (const [role, email] of accounts) {
  if (only && role !== only) continue;
  const login = await timed(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Demo@2026" }),
  });
  if (login.status !== 200) {
    results.push({ role, target: "LOGIN", status: login.status, ms: login.ms });
    continue;
  }
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const H = { cookie };

  let slow = 0, bad = 0;
  for (const p of pages) {
    const r = await timed(`${BASE}${p}`, { headers: H });
    if (typeof r.status === "number" && (r.status >= 500 || (r.status !== 200 && r.status !== 307))) bad++;
    if (r.ms > 3000) slow++;
    if (typeof r.status === "number" && r.status >= 500) {
      results.push({ role, target: p, status: r.status, ms: r.ms });
    }
  }
  let apiBad = 0, apiSlow = 0, slowest = null;
  for (const a of APIs) {
    const r = await timed(`${BASE}${a}`, { headers: H });
    if (r.status !== 200) {
      apiBad++;
      results.push({ role, target: a, status: r.status, ms: r.ms });
    }
    if (r.ms > 3000) {
      apiSlow++;
      if (!slowest || r.ms > slowest.ms) slowest = { target: a, ms: r.ms };
    }
  }
  console.log(`${role.padEnd(18)} pages: ${pages.length - bad}/${pages.length} ok   apis: ${APIs.length - apiBad}/${APIs.length} ok   slowPages: ${slow}  slowApis: ${apiSlow}${slowest ? ` (slowest ${slowest.target} ${slowest.ms}ms)` : ""}`);
}

console.log("\n--- failures ---");
if (!results.length) console.log("none");
for (const r of results) console.log(`${r.role} | ${r.target} | ${r.status} | ${r.ms}ms`);