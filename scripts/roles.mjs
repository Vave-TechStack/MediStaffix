/**
 * Role scoping check.
 *
 * Signs in as the hospital client and doctor demo users and confirms that the
 * portal scopes and the role permission matrix actually restrict the API, not
 * just the navigation.
 */

const BASE = process.env.MSX_BASE ?? "http://localhost:3100";
const PASSWORD = "Demo@2026";

const failures = [];
const passes = [];

async function session(email) {
  let cookie = "";
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { cookie, status: res.status };
}

function client(cookie) {
  return async (path, init = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", cookie, ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { status: res.status, body };
  };
}

function check(label, ok, detail = "") {
  if (ok) passes.push(label);
  else failures.push(`${label}${detail ? ` :: ${detail}` : ""}`);
}

async function main() {
  /* ------------------------- hospital client ------------------------- */
  const login = await fetch(`${BASE}/api/auth/login`).then((r) => r.json()).catch(() => null);
  void login;

  const hc = await session("client@astergrandmedicalcentre.demo");
  check("hospital client login", hc.status === 200, `status=${hc.status}`);
  if (hc.status !== 200) {
    // Fall back to whatever the seeded portal account is called.
    console.error("hospital client login failed; check the seeded portal email");
  } else {
    const get = client(hc.cookie);
    const hospitals = await get("/api/hospitals");
    check("client sees hospitals", hospitals.status === 200, `status=${hospitals.status}`);

    const invoices = await get("/api/invoices");
    check("client can list invoices", invoices.status === 200, `status=${invoices.status}`);
    if (invoices.status === 200) {
      const hospitalIds = new Set((hospitals.body?.rows ?? []).map((h) => h.id));
      const leaked = (invoices.body.rows ?? []).filter((i) => !hospitalIds.has(i.hospitalId));
      check("client invoices are scoped to their hospital", leaked.length === 0, `${leaked.length} row(s) out of scope`);
    }

    const payroll = await get("/api/payroll-runs");
    check("client cannot list payroll runs", payroll.status === 403, `status=${payroll.status}`);

    const audit = await get("/api/audit");
    check("client cannot read the audit log", audit.status === 403, `status=${audit.status}`);

    const create = await get("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ invoiceNo: "HACK-001", hospitalId: "HSP-0001", billingPeriod: "2026-01", invoiceDate: "2026-01-01", dueDate: "2026-01-31", status: "Draft" }),
    });
    check("client cannot create an invoice", create.status === 403, `status=${create.status}`);

    // Regression: the hospital list and the metadata lookups must be scoped too.
    if (hospitals.status === 200) {
      check(
        "client sees only their own hospital",
        hospitals.body.rows.length === 1,
        `${hospitals.body.rows.length} row(s)`
      );
    }

    const shifts = await get("/api/shifts?pageSize=200");
    if (shifts.status === 200 && hospitals.status === 200) {
      const ownHospital = hospitals.body.rows[0]?.id;
      const foreign = (shifts.body.rows ?? []).filter((s) => s.hospitalId && s.hospitalId !== ownHospital);
      check("client shifts are scoped to their hospital", foreign.length === 0, `${foreign.length} row(s) out of scope`);
    }

    const meta = await get("/api/resources/hospitals");
    if (meta.status === 200) {
      const lookups = meta.body?.lookups ?? {};
      check("client lookup roster is scoped", (lookups.hospitals ?? []).length <= 1, `${(lookups.hospitals ?? []).length} hospital(s) exposed`);
      const employeeTotal = Number(meta.body?.rowsAsCounts?.employees ?? 0);
      check("client employee roster is scoped", employeeTotal <= 25, `${employeeTotal} employee(s) exposed`);
    }

    // Regression: the demo role switcher must not let a portal role self-promote.
    const escalate = await get("/api/auth/switch", {
      method: "POST",
      body: JSON.stringify({ userId: "USR-001" }),
    });
    check("client cannot switch to super admin", escalate.status === 403, `status=${escalate.status}`);
  }

  /* ----------------------------- doctor ----------------------------- */
  const doc = await session("doctor@medistaffix.demo");
  check("doctor login", doc.status === 200, `status=${doc.status}`);
  if (doc.status === 200) {
    const get = client(doc.cookie);
    const shifts = await get("/api/shifts");
    check("doctor can list own shifts", shifts.status === 200, `status=${shifts.status}`);
    const selfEmployeeId = (() => {
      const pays = shifts.body?.rows?.[0]?.employeeId ?? null;
      return pays;
    })();
    if (shifts.status === 200 && selfEmployeeId) {
      const foreign = (shifts.body.rows ?? []).filter((s) => s.employeeId && s.employeeId !== selfEmployeeId);
      check("doctor shifts are scoped to themself", foreign.length === 0, `${foreign.length} row(s) out of scope`);
      check("doctor portal has shifts to show", (shifts.body.rows ?? []).length > 0, `${(shifts.body.rows ?? []).length} row(s)`);
    }

    const deployments = await get("/api/deployments?pageSize=200");
    if (deployments.status === 200 && selfEmployeeId) {
      const foreign = (deployments.body.rows ?? []).filter((d) => d.employeeId && d.employeeId !== selfEmployeeId);
      check("doctor deployments are scoped to themself", foreign.length === 0, `${foreign.length} row(s) out of scope`);
      check("doctor portal has a deployment to show", (deployments.body.rows ?? []).length > 0, `${(deployments.body.rows ?? []).length} row(s)`);
    }

    // Regression: a doctor must not be able to self-promote via the demo switcher.
    const escalate = await get("/api/auth/switch", {
      method: "POST",
      body: JSON.stringify({ userId: "USR-001" }),
    });
    check("doctor cannot switch to super admin", escalate.status === 403, `status=${escalate.status}`);

    const employees = await get("/api/employees");
    check("doctor cannot list the employee register", employees.status === 403, `status=${employees.status}`);

    const settings = await get("/api/settings");
    check("doctor cannot read settings", settings.status === 403, `status=${settings.status}`);

    const dashboard = await get("/api/aggregate/dashboard");
    check("doctor gets a doctor dashboard", dashboard.status === 200 && dashboard.body?.meta?.isPortal === true, `status=${dashboard.status}`);

    const payslips = await get("/api/payslips");
    check("doctor can list payslips", payslips.status === 200, `status=${payslips.status}`);
    if (payslips.status === 200 && payslips.body.rows.length) {
      const ids = new Set(payslips.body.rows.map((p) => p.employeeId));
      check("doctor payslips are scoped to themself", ids.size === 1, `${ids.size} employee id(s)`);
    }
  }

  /* ---------------------------- anonymous ---------------------------- */
  const anon = client("");
  const anonList = await anon("/api/hospitals");
  check("anonymous list is rejected", anonList.status === 401, `status=${anonList.status}`);
  const anonAgg = await anon("/api/aggregate/dashboard");
  check("anonymous aggregate is rejected", anonAgg.status === 401, `status=${anonAgg.status}`);

  console.log(`\nPASS ${passes.length}`);
  for (const f of failures) console.log(`FAIL ${f}`);
  console.log(failures.length ? `\n${failures.length} FAILURES` : "\nALL GREEN");
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error("role test crashed:", e);
  process.exit(1);
});
