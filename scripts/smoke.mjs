/**
 * End-to-end smoke test against the running dev server.
 *
 * Signs in as the Super Admin demo user and exercises every resource list,
 * metadata document, aggregate and the highest-value workflow action, asserting
 * that each returns a well-formed payload rather than an error.
 */

const BASE = process.env.MSX_BASE ?? "http://localhost:3100";
const EMAIL = process.env.MSX_EMAIL ?? "meera.raghavan@medistaffix.demo";
const PASSWORD = process.env.MSX_PASSWORD ?? "Demo@2026";

let cookie = "";
const failures = [];
const passes = [];

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

function check(label, ok, detail = "") {
  if (ok) passes.push(label);
  else failures.push(`${label}${detail ? ` :: ${detail}` : ""}`);
}

const RESOURCES = [
  "hospitals", "leads", "contacts", "opportunities", "followups", "contracts",
  "candidates", "requisitions", "applications", "interviews", "offers",
  "employees", "salaryStructures", "deployments", "shifts", "attendance", "leave-requests",
  "payroll-runs", "payroll-items", "payslips",
  "invoices", "payments", "expenses", "purchase-orders",
  "requirements", "service-requests", "documents", "users",
];

const AGGREGATES = ["dashboard", "finance", "payroll-reports", "recruitment", "operations", "doctors"];

async function main() {
  const login = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  check("login", login.status === 200 && login.body?.ok, `status=${login.status} ${JSON.stringify(login.body)}`);
  if (!cookie) {
    console.error("no session cookie returned");
    process.exit(1);
  }

  for (const resource of RESOURCES) {
    const meta = await call(`/api/resources/${resource}`);
    check(`metadata ${resource}`, meta.status === 200 && Array.isArray(meta.body?.columns) && meta.body.columns.length > 0, `status=${meta.status} ${JSON.stringify(meta.body).slice(0, 160)}`);

    const list = await call(`/api/${resource}?pageSize=5`);
    const ok = list.status === 200 && Array.isArray(list.body?.rows) && typeof list.body?.total === "number";
    check(`list ${resource}`, ok, `status=${list.status} ${JSON.stringify(list.body).slice(0, 160)}`);
    if (ok && list.body.rows.length) {
      const hasCells = list.body.rows[0].__cells && typeof list.body.rows[0].__cells === "object";
      check(`cells ${resource}`, hasCells, JSON.stringify(list.body.rows[0]).slice(0, 120));
    }
  }

  for (const key of AGGREGATES) {
    const agg = await call(`/api/aggregate/${key}`);
    check(`aggregate ${key}`, agg.status === 200 && agg.body !== null, `status=${agg.status} ${JSON.stringify(agg.body).slice(0, 160)}`);
  }

  const settings = await call("/api/settings");
  check("settings read", settings.status === 200 && Boolean(settings.body?.settings?.companyName), `status=${settings.status}`);
  const audit = await call("/api/audit?pageSize=10");
  check("audit read", audit.status === 200 && Array.isArray(audit.body?.rows), `status=${audit.status}`);
  const search = await call("/api/search?q=hospital");
  check("search", search.status === 200, `status=${search.status}`);
  const notifications = await call("/api/notifications");
  check("notifications", notifications.status === 200, `status=${notifications.status}`);

  /* -------------------- workflow actions -------------------- */

  const leads = await call("/api/leads?pageSize=5");
  const lead = leads.body?.rows?.[0];
  if (lead) {
    const moved = await call("/api/actions/lead.move", {
      method: "POST",
      body: JSON.stringify({ id: lead.id, stage: "Contacted", note: "Smoke test." }),
    });
    check("action lead.move", moved.status === 200 && moved.body?.ok, `status=${moved.status} ${JSON.stringify(moved.body)}`);
  }

  const apps = await call("/api/applications?pageSize=5");
  const app = apps.body?.rows?.find((a) => a.stage === "Applied");
  if (app) {
    const staged = await call("/api/actions/application.stage", {
      method: "POST",
      body: JSON.stringify({ id: app.id, stage: "Screening" }),
    });
    check("action application.stage", staged.status === 200 && staged.body?.ok, `status=${staged.status} ${JSON.stringify(staged.body)}`);
  }

  const expenses = await call("/api/expenses?pageSize=50");
  const expense = expenses.body?.rows?.find((e) => ["Submitted", "Under Review"].includes(e.status));
  if (expense) {
    const decided = await call("/api/actions/expense.decide", {
      method: "POST",
      body: JSON.stringify({ id: expense.id, action: "Approved", note: "Smoke test approval." }),
    });
    check("action expense.decide", decided.status === 200 && decided.body?.ok, `status=${decided.status} ${JSON.stringify(decided.body)}`);
  }

  const invoices = await call("/api/invoices?pageSize=50");
  const invoice = invoices.body?.rows?.find((i) => i.status === "Draft");
  if (invoice) {
    const advanced = await call("/api/actions/invoice.advance", {
      method: "POST",
      body: JSON.stringify({ id: invoice.id, status: "Pending Approval" }),
    });
    check("action invoice.advance", advanced.status === 200 && advanced.body?.ok, `status=${advanced.status} ${JSON.stringify(advanced.body)}`);
  }

  const leaves = await call("/api/leave-requests?pageSize=50");
  const pending = leaves.body?.rows?.filter((l) => l.status === "Pending") ?? [];
  if (pending.length) {
    // Leave approval enforces a balance check, so some pending requests are
    // legitimately refused. Accept either outcome as long as the endpoint
    // returns a structured decision rather than a crash.
    const outcomes = [];
    for (const leave of pending.slice(0, 5)) {
      const r = await call("/api/actions/leave.decide", {
        method: "POST",
        body: JSON.stringify({ id: leave.id, decision: "Approved", note: "Smoke test." }),
      });
      outcomes.push(r.status);
      if (r.status === 200) break;
    }
    check(
      "action leave.decide",
      outcomes.every((s) => s === 200 || s === 422),
      `statuses=${outcomes.join(",")}`
    );
  }

  const period = new Date().toISOString().slice(0, 7);
  const preview = await call("/api/actions/payroll.preview", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
  check(
    "action payroll.preview",
    preview.status === 200 && Array.isArray(preview.body?.data?.lines) && preview.body.data.totalEmployees > 0,
    `status=${preview.status} ${JSON.stringify(preview.body).slice(0, 160)}`
  );

  /* -------------------- create / update / delete -------------------- */

  const created = await call("/api/contacts", {
    method: "POST",
    body: JSON.stringify({
      hospitalId: (await call("/api/hospitals?pageSize=1")).body?.rows?.[0]?.id,
      name: "Smoke Test Contact",
      designation: "Quality Manager",
      email: "smoke.test@medistaffix.demo",
      phone: "+91 90000 00000",
      isPrimary: false,
      influenceLevel: "High",
      notes: "Created by the smoke test.",
    }),
  });
  check("create contact", created.status === 201 && Boolean(created.body?.row?.id), `status=${created.status} ${JSON.stringify(created.body).slice(0, 200)}`);

  if (created.body?.row?.id) {
    const id = created.body.row.id;
    const updated = await call(`/api/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ notes: "Updated by the smoke test." }),
    });
    check("update contact", updated.status === 200, `status=${updated.status} ${JSON.stringify(updated.body).slice(0, 160)}`);

    const removed = await call(`/api/contacts/${id}`, { method: "DELETE" });
    check("delete contact", removed.status === 200, `status=${removed.status} ${JSON.stringify(removed.body).slice(0, 160)}`);
  }

  /* -------------------- validation must be enforced -------------------- */

  const invalid = await call("/api/contacts", {
    method: "POST",
    body: JSON.stringify({ name: "" }),
  });
  check("validation rejects empty contact", invalid.status === 422 && Boolean(invalid.body?.fieldErrors?.name), `status=${invalid.status}`);

  const unknown = await call("/api/not-a-resource");
  check("unknown resource 404", unknown.status === 404, `status=${unknown.status}`);

  /* -------------------- report -------------------- */

  console.log(`\nPASS ${passes.length}`);
  for (const f of failures) console.log(`FAIL ${f}`);
  console.log(failures.length ? `\n${failures.length} FAILURES` : "\nALL GREEN");
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error("smoke test crashed:", e);
  process.exit(1);
});
