const BASE = "http://localhost:3100";

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Demo@2026" }),
  });
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

async function get(cookie, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const db = JSON.parse(
  (await import("node:fs")).readFileSync("data/db.json", "utf8")
);
const clientUser = db.users.find((u) => u.email === "client@astergrandmedicalcentre.demo");
const doctorUser = db.users.find((u) => u.email === "doctor@medistaffix.demo");
const ownHospital = clientUser.hospitalId;
const ownEmployee = doctorUser.employeeId;

console.log(`hospital client owns ${ownHospital}; doctor owns ${ownEmployee}\n`);

const listEndpoints = [
  "/api/hospitals?pageSize=200",
  "/api/contacts?pageSize=200",
  "/api/contracts?pageSize=200",
  "/api/opportunities?pageSize=200",
  "/api/requisitions?pageSize=200",
  "/api/shifts?pageSize=200",
  "/api/deployments?pageSize=200",
  "/api/invoices?pageSize=200",
  "/api/documents?pageSize=200",
  "/api/service-requests?pageSize=200",
];

let leaks = 0;

console.log("=== hospital client: list scoping ===");
const cc = await login("client@astergrandmedicalcentre.demo");
for (const p of listEndpoints) {
  const r = await get(cc, p);
  if (r.status !== 200) { console.log(`${p.padEnd(36)} -> ${r.status} (denied)`); continue; }
  const rows = r.data?.rows ?? r.data?.data ?? [];
  const foreign = rows.filter(
    (x) => x.hospitalId && x.hospitalId !== ownHospital && x.id !== ownHospital
  );
  const flag = foreign.length ? `LEAK ${foreign.length}` : "ok";
  if (foreign.length) leaks++;
  console.log(`${p.padEnd(36)} -> ${r.status} rows=${String(rows.length).padEnd(4)} ${flag}`);
}

console.log("\n=== hospital client: metadata lookups ===");
const meta = await get(cc, "/api/resources/hospitals");
if (meta.status === 200) {
  const l = meta.data.lookups;
  const okH = l.hospitals.length <= 1;
  console.log(`hospitals lookup: ${l.hospitals.length} ${okH ? "ok" : "LEAK"}`);
  console.log(`employees lookup: ${l.employees.length} ${l.employees.length <= 20 ? "ok" : "LEAK"}`);
  console.log(`designations: ${l.designations.length}`);
  console.log(`rowsAsCounts: ${JSON.stringify(meta.data.rowsAsCounts)}`);
  if (!okH || l.employees.length > 20) leaks++;
}

console.log("\n=== doctor: list scoping ===");
const dc = await login("doctor@medistaffix.demo");
for (const p of listEndpoints) {
  const r = await get(dc, p);
  if (r.status !== 200) { console.log(`${p.padEnd(36)} -> ${r.status} (denied)`); continue; }
  const rows = r.data?.rows ?? r.data?.data ?? [];
  const foreign = rows.filter((x) => x.employeeId && x.employeeId !== ownEmployee);
  const flag = foreign.length ? `LEAK ${foreign.length}` : "ok";
  if (foreign.length) leaks++;
  console.log(`${p.padEnd(36)} -> ${r.status} rows=${String(rows.length).padEnd(4)} ${flag}`);
}

console.log(`\n=== leaks detected: ${leaks} ===`);