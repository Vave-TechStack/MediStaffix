import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Contact,
  FileSignature,
  HeartPulse,
  Lock,
  Menu,
  Receipt,
  Repeat2,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Wallet,
  Workflow,
} from "lucide-react";
import { Faq } from "@/components/landing/faq";
import { Logo } from "@/components/shell/sidebar";
import { getDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const db = await getDb();
  const counts = {
    hospitals: db.hospitals.length,
    doctors: db.employees.filter((e) => e.doctorProfile).length,
    candidates: db.candidates.length,
    deployments: db.deployments.length,
    invoices: db.invoices.length,
    shifts: db.shifts.length,
  };

  const modules = [
    { icon: Contact, title: "CRM", body: "Hospital records, stakeholder contacts, a drag-and-drop lead pipeline, weighted opportunities, follow-up reminders and staffing contracts with per-designation billing rates." },
    { icon: UserPlus, title: "Recruitment", body: "Candidate database with credential-verification tracking, hospital-approved requisitions, application pipeline, interview scheduling with scorecards, offer letters and a joining workflow." },
    { icon: HeartPulse, title: "HRM & Workforce", body: "Employee records, doctor directory, shift rosters with conflict detection, calendar attendance, leave balances with manager approval and swap requests." },
    { icon: Repeat2, title: "Doctor Deployment", body: "Hospital requirement to allocation to confirmed deployment, with overlap prevention, replacement and transfer requests, deployment letters and hospital-wise staffing strength." },
    { icon: Wallet, title: "Payroll", body: "Component-wise salary structures, attendance-driven monthly computation, preview before approval, locked finalisation, payslips, incentives, deductions and salary revisions." },
    { icon: Receipt, title: "ERP & Finance", body: "Invoices generated from approved deployments and duty days, receipts and allocation, outstanding ageing, expense approval, purchase orders and a finance overview." },
    { icon: Workflow, title: "Operations", body: "Hospital requirements, doctor allocation, shift tracking, replacement requests and a service request desk with SLA tracking from the client portal." },
    { icon: BarChart3, title: "Analytics", body: "Revenue, payroll, recruitment, deployment, profitability and outstanding reports — all computed from live records, filterable and exportable to CSV." },
    { icon: ScrollText, title: "Documents", body: "A single register for resumes, registrations, certificates, contracts, offers, deployment letters, payslips and invoices, with expiry tracking and reusable templates." },
  ];

  const flow = [
    { step: "01", title: "Hospital requirement", body: "A hospital client raises a staffing need with designation, category, shift pattern, budget and target date — from the client portal or the account team." },
    { step: "02", title: "Requisition and sourcing", body: "The requirement becomes a job requisition. Candidates are screened against qualification, experience and location, with credential checks tracked per candidate." },
    { step: "03", title: "Interview and offer", body: "Interviews are scheduled with a panel and scorecard. Selected candidates receive a generated offer letter, then complete onboarding to become an employee." },
    { step: "04", title: "Availability and allocation", body: "The allocation engine checks the candidate is not already on an active deployment, then confirms a deployment against the hospital's contract rate." },
    { step: "05", title: "Roster, attendance, payroll", body: "Shifts generate attendance, attendance drives the monthly payroll computation, and approved figures are locked on finalisation." },
    { step: "06", title: "Billing and collection", body: "The invoice is generated from the deployment and approved duty days, approved, released to the client, and settled through tracked receipts." },
  ];

  const guarantees = [
    { icon: Lock, title: "Authorisation on the server", body: "Permissions are checked inside every API route handler. Hiding a menu item is presentation only — a direct request is still refused." },
    { icon: ShieldCheck, title: "Role-scoped portals", body: "A hospital client sees only their own staffing strength, rosters and invoices. A doctor sees only their own deployment, shifts, attendance, payslips and leave." },
    { icon: ClipboardCheck, title: "Immutable audit trail", body: "Every create, update, delete, approval, status transition and login is recorded with actor, role, timestamp and the fields that changed." },
    { icon: CheckCircle2, title: "Honest data labelling", body: "Verification states are demo workflow labels, statutory rates are configurable and caveated, and payment workflows are marked simulated rather than presented as real." },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ------------------------------ nav ------------------------------ */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(10px)" }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
          <Logo tone="dark" />
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {[
              ["Platform", "#platform"],
              ["Modules", "#modules"],
              ["How it works", "#how"],
              ["Analytics", "#analytics"],
              ["Security", "#security"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted ring-focus transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="#contact" className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-medium ring-focus hover:bg-[var(--surface-2)] sm:block">
              Contact sales
            </a>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-[13.5px] font-medium text-white shadow-sm ring-focus transition-colors hover:bg-brand-700 dark:bg-mint-600 dark:text-brand-950 dark:hover:bg-mint-500">
              Explore live demo <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="rounded-lg p-2 text-muted ring-focus hover:bg-[var(--surface-2)] lg:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------ hero ----------------------------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 460px at 78% -6%, rgba(32,184,154,0.16), transparent 62%), radial-gradient(760px 420px at 6% 12%, rgba(23,107,135,0.14), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[minmax(0,1fr)_520px] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/40 bg-mint-500/10 px-3.5 py-1.5 text-[12.5px] font-medium text-mint-700 dark:text-mint-300">
              <Sparkles className="h-3.5 w-3.5" /> Interactive demonstration · fictional data
            </span>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-tight sm:text-[52px]">
              Smarter Healthcare Staffing.
              <br />
              <span className="bg-gradient-to-r from-sea-600 to-mint-500 bg-clip-text text-transparent">Seamless Workforce Management.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
              Recruit, deploy, manage and pay healthcare professionals through one connected platform. MediStaffix joins
              hospital CRM, recruitment, HRM, payroll, doctor deployment, operations and analytics into a single
              operational picture.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3.5 text-[15px] font-medium text-white shadow-lg ring-focus transition-all hover:bg-brand-700 hover:shadow-xl dark:bg-mint-600 dark:text-brand-950 dark:hover:bg-mint-500">
                Explore live demo <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-3.5 text-[15px] font-medium ring-focus transition-colors hover:border-sea-400">
                Contact sales
              </a>
            </div>
            <p className="mt-5 text-[12.5px] text-muted">
              No account required. The demonstration is pre-populated and every workflow runs locally.
            </p>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
              {[
                [counts.hospitals, "Hospital clients"],
                [counts.doctors, "Doctors on record"],
                [counts.deployments, "Deployment records"],
                [counts.invoices, "Invoices generated"],
              ].map(([value, label]) => (
                <div key={String(label)}>
                  <dt className="text-[26px] font-semibold tracking-tight tabular-nums">{value}</dt>
                  <dd className="mt-0.5 text-[12.5px] text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product preview card */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border shadow-[var(--shadow-lift)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[11.5px] text-muted">MediStaffix · Executive dashboard</span>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Total hospitals", String(counts.hospitals), "brand"],
                    ["Registered doctors", String(counts.doctors), "info"],
                    ["Monthly payroll runs", String(db.payrollRuns.length), "success"],
                    ["Open requirements", String(db.requirements.filter((r) => r.status === "Open").length), "warning"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted">{label}</p>
                      <p className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums">{value}</p>
                      <span
                        className="mt-2 block h-1 w-10 rounded-full"
                        style={{ background: tone === "brand" ? "var(--color-brand-700)" : tone === "info" ? "#0ea5e9" : tone === "success" ? "#10b981" : "#f59e0b" }}
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[11.5px] font-semibold text-muted">Revenue vs payroll · last 12 months</p>
                  <svg viewBox="0 0 320 96" className="mt-3 w-full" role="img" aria-label="Illustrative revenue and payroll trend">
                    <defs>
                      <linearGradient id="msxLine" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-mint-500)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--color-mint-500)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 78 L32 70 L64 74 L96 58 L128 62 L160 46 L192 52 L224 36 L256 42 L288 28 L320 22 L320 96 L0 96 Z" fill="url(#msxLine)" />
                    <path d="M0 78 L32 70 L64 74 L96 58 L128 62 L160 46 L192 52 L224 36 L256 42 L288 28 L320 22" fill="none" stroke="var(--color-mint-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M0 88 L32 84 L64 86 L96 80 L128 82 L160 74 L192 78 L224 70 L256 73 L288 66 L320 62" fill="none" stroke="var(--color-sea-500)" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                  </svg>
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint-500" /> Revenue invoiced</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sea-500" /> Payroll cost</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    [Building2, "Hospital CRM"],
                    [CalendarDays, "Shift rosters"],
                    [Wallet, "Payroll & billing"],
                  ].map(([Icon, label]) => {
                    const I = Icon as typeof Building2;
                    return (
                      <div key={String(label)} className="rounded-lg border py-3" style={{ borderColor: "var(--border)" }}>
                        <I className="mx-auto h-4 w-4 text-mint-600" />
                        <p className="mt-1.5 text-[11px] text-muted">{String(label)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-muted">
              Preview illustration. The live demo renders these figures from actual seeded records.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------- platform ---------------------------- */}
      <section id="platform" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">Platform overview</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">One operating system for a healthcare staffing business</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              A staffing company touches the same person in four systems — recruitment, HR, deployment and payroll.
              MediStaffix keeps one identity per person and links every stage, so a change in one module is visible in
              the others without re-keying or reconciliation.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Activity, title: "Single person record", body: "A candidate becomes an employee exactly once. Deployment, payroll and billing all reference that record." },
              { icon: Workflow, title: "Cross-module workflows", body: "Conversion, onboarding, allocation, payroll finalisation and invoicing are actions, not disconnected forms." },
              { icon: FileSignature, title: "Contract-driven billing", body: "Rates live on the contract. Invoices are generated from deployments and approved duty days, not typed in by hand." },
              { icon: Target, title: "Integrity by rule", body: "Overlapping active deployments, shift clashes, leave overlaps and over-payment are rejected server-side." },
            ].map((f) => (
              <div key={f.title} className="surface-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-500/12 text-mint-600">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- modules ---------------------------- */}
      <section id="modules" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">Core modules</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">Nine connected modules, one navigation</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Every module in the demonstration is backed by working forms, searchable tables, filters, exports and
              approval workflows — not static screens.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div key={m.title} className="surface-card flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-600/10 text-sea-700 dark:text-mint-300">
                    <m.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-[15.5px] font-semibold">{m.title}</h3>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------- how it works -------------------------- */}
      <section id="how" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">How it works</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">From hospital requirement to settled invoice</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Each step below is executable in the demonstration using the real interface controls.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flow.map((f) => (
              <li key={f.step} className="surface-card relative p-5">
                <span className="text-[12px] font-bold tracking-widest text-mint-600">{f.step}</span>
                <h3 className="mt-1.5 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------- hospital solutions ---------------------- */}
      <section className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">For hospital clients</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">A staffing partner portal your HR team can actually use</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Hospital clients get their own scoped workspace: their own staffing strength, the doctors currently
              deployed, the roster, the invoices raised against their contract and a service desk for replacement and
              escalation requests.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Raise a staffing requirement with designation, shift pattern, budget and target date",
                "See exactly who is deployed, on which shift, and for how long",
                "Track invoices, payment status and outstanding balances against contract",
                "Raise a replacement or escalation request and follow it to resolution",
                "Download appointment, deployment and contract documents for your records",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-mint-600" style={{ height: 18, width: 18 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface-card overflow-hidden">
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <span className="h-2.5 w-2.5 rounded-full bg-mint-500" />
              <p className="text-[12.5px] font-semibold">Hospital client portal</p>
              <span className="ml-auto rounded-md border px-2 py-0.5 text-[10.5px] text-muted" style={{ borderColor: "var(--border)" }}>
                Role-scoped
              </span>
            </div>
            <div className="space-y-3 p-5 text-[13px]">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Deployed staff", String(db.deployments.filter((d) => d.status === "Active").length)],
                  ["Open invoices", String(db.invoices.filter((i) => i.outstanding > 0).length)],
                  ["Open requests", String(db.serviceRequests.filter((s) => s.status === "Open").length)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10.5px] uppercase tracking-wide text-muted">{l}</p>
                    <p className="mt-1 text-[20px] font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-[11.5px] font-semibold text-muted">Access boundary</p>
                <p className="mt-1.5 leading-relaxed text-muted">
                  A client request is filtered server-side to their own hospital. Another client&apos;s deployments,
                  rosters, invoices and documents are never returned, regardless of the URL or the request payload.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- analytics ---------------------------- */}
      <section id="analytics" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">Analytics and reporting</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">Numbers that reconcile back to the operations</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Every figure is derived from the underlying records rather than a separate metrics store, so a payroll
              finalisation or an approved invoice immediately changes the charts and reports.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Revenue reporting", body: "Monthly revenue, hospital-wise revenue, doctor-wise billing and outstanding invoice ageing, with collected versus invoiced separated." },
              { title: "Payroll reporting", body: "Gross, deductions by component, net payable, incentives and overtime per period, plus a doctor-level attendance and loss-of-pay view." },
              { title: "Recruitment reporting", body: "Funnel conversion, candidate source effectiveness, time-to-hire per candidate and requisition-level fill rates." },
              { title: "Profitability", body: "Billed versus doctor cost versus approved expenses per hospital, with gross margin and margin percentage kept distinct from operating surplus." },
            ].map((c) => (
              <div key={c.title} className="surface-card p-5">
                <h3 className="text-[14.5px] font-semibold">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{c.body}</p>
                <p className="mt-3 text-[11.5px] font-medium text-mint-600">CSV export on every report</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- security ---------------------------- */}
      <section id="security" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">Security and compliance posture</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">Built to treat workforce data as sensitive</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Medical registration numbers, identity documents, bank details, salary information and employment records
              are handled as sensitive data throughout. The following describes what this build implements — it is not a
              claim of certification.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {guarantees.map((g) => (
              <div key={g.title} className="surface-card flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800/8 text-brand-700 dark:bg-mint-500/15 dark:text-mint-300">
                  <g.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold">{g.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{g.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border p-5 text-[13px] leading-relaxed" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <p className="font-semibold">Deployment note.</p>
            <p className="mt-1.5 text-muted">
              This demonstration stores data in a local JSON document and signs sessions with a development secret.
              A production deployment would use PostgreSQL with Prisma, hashed credentials, a strong secret from the
              environment, encrypted document storage, a shared rate-limit store, and jurisdiction-specific retention
              and data-subject request handling. The data model in this build is designed to map onto that schema
              without changing the frontend.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------ FAQ ------------------------------ */}
      <section id="faq" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-mint-600">Frequently asked questions</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">Straight answers about scope and limits</h2>
          </div>
          <div className="mt-8 max-w-4xl">
            <Faq />
          </div>
        </div>
      </section>

      {/* ---------------------------- contact ----------------------------- */}
      <section id="contact" className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-[32px] font-semibold leading-tight tracking-tight">See the whole workflow, not a slide</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            The demonstration is pre-populated with hospitals, doctors, candidates, deployments, payroll runs, invoices
            and expenses so you can trace a requirement all the way to a settled invoice. Switch roles at any time from
            the profile menu to see how the platform reshapes itself.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3.5 text-[15px] font-medium text-white shadow-lg ring-focus transition-all hover:bg-brand-700 dark:bg-mint-600 dark:text-brand-950 dark:hover:bg-mint-500">
              Explore live demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={`mailto:${db.settings.supportEmail}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-3.5 text-[15px] font-medium ring-focus transition-colors hover:border-sea-400">
              Contact sales
            </a>
          </div>
          <p className="mt-5 text-[12.5px] text-muted">
            {db.settings.supportEmail} · {db.settings.supportPhone} · {db.settings.registeredAddress}
          </p>
        </div>
      </section>

      <footer className="border-t py-10" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo tone="dark" />
            <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-muted">
              {db.settings.tagline}. An integrated CRM, recruitment, HRM, payroll and deployment platform for
              healthcare staffing businesses.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[13px] sm:grid-cols-3">
            {[
              ["Platform", [["Overview", "#platform"], ["Modules", "#modules"], ["How it works", "#how"]]],
              ["Resources", [["Analytics", "#analytics"], ["Security", "#security"], ["FAQ", "#faq"]]],
              ["Product", [["Sign in", "/login"], ["Dashboard", "/dashboard"], ["Contact", "#contact"]]],
            ].map(([group, links]) => (
              <div key={String(group)}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{String(group)}</p>
                <ul className="mt-2 space-y-1.5">
                  {(links as [string, string][]).map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith("/") ? (
                        <Link href={href} className="ring-focus transition-colors hover:text-[var(--text)]">
                          {label}
                        </Link>
                      ) : (
                        <a href={href} className="ring-focus transition-colors hover:text-[var(--text)]">
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t px-5 pt-6 text-[11.5px] leading-relaxed text-muted" style={{ borderColor: "var(--border)" }}>
          <p>
            <span className="font-semibold">Demonstration notice.</span> MediStaffix is presented here as a product
            demonstration. All organisations, people, medical registration numbers, contracts, invoices and payments
            shown are fictional and generated for this environment. No customer testimonials, hospital partnerships,
            compliance certifications or business achievements are claimed. Statutory payroll and tax values are
            configurable illustrative settings, not legal or tax advice. Payment and communication workflows are
            simulated and never contact a bank, messaging or email provider.
          </p>
        </div>
      </footer>
    </div>
  );
}
