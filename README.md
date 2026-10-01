# MediStaffix

Healthcare staffing ERP / CRM / HRM demonstration. MediStaffix models the
end-to-end operation of a medical staffing agency: hospital relationship
management, doctor recruitment, workforce deployment, payroll, billing and
finance reporting.

All data is fictional demo data generated from a deterministic seed.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript, Tailwind CSS v4
- Recharts for reporting charts
- JWT sessions in an httpOnly cookie
- File-backed JSON persistence (`src/lib/store.ts`)

## Running locally

```bash
npm install
npm run dev      # http://localhost:3100
```

The database is created on first read at `data/db.json`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3100 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run smoke` | End-to-end API smoke test against the running server |
| `npm run roles` | Authentication and RBAC verification |
| `npm run verify` | typecheck + smoke + roles |

`smoke` and `roles` expect a server already running on port 3100.

Reset the demo data at any time:

```bash
node scripts/reset-db.mjs
```

## Demo accounts

Every account uses the password `Demo@2026`.

| Role | Email |
| --- | --- |
| Super Admin | `meera.raghavan@medistaffix.demo` |
| Business Admin | `aditya.kulkarni@medistaffix.demo` |
| HR Manager | `nandini.iyer@medistaffix.demo` |
| Recruiter | `faisal.khan@medistaffix.demo` |
| Payroll Manager | `priya.menon@medistaffix.demo` |
| Finance Manager | `vikram.shah@medistaffix.demo` |
| Operations Manager | `arun.prasad@medistaffix.demo` |
| Hospital Client | `client@astergrandmedicalcentre.demo` |
| Doctor | `doctor@medistaffix.demo` |

Hospital Client and Doctor accounts are portal-scoped: they only ever see their
own hospital or their own records, and navigation is filtered accordingly.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | Production | Signs the session JWT. A fallback demo value is used when unset, which must not be relied on outside local development. |

## Deployment note

Persistence is a JSON document on disk. Serverless hosts such as Vercel provide
a read-only filesystem outside `/tmp`, so `src/lib/store.ts` detects that
environment (`VERCEL` / `AWS_LAMBDA_FUNCTION_NAME`) and keeps the dataset in
memory instead. The application is fully functional there, but writes last only
for the lifetime of a warm instance and reset on a cold start.

For a durable production deployment, reimplement `src/lib/store.ts` against a
real database. `prisma/schema.prisma` mirrors the entity shapes, and only the
store module and the `src/app/api/**` handlers need to change.

## Disclaimer

Demonstration build. All hospitals, doctors, contracts, invoices and payments
are fictional. Payment, messaging and notification workflows are simulated
locally; nothing is sent to a bank, SMS or email gateway.