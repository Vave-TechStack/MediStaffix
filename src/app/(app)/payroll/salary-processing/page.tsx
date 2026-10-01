"use client";

/**
 * Salary processing console.
 *
 * Drives the payroll run lifecycle end to end: preview the computed sheet for a
 * period, commit it, push it through review/approval, generate payslips, then
 * mark it paid. Every step is a server-side workflow action with its own
 * permission check, so the button set here mirrors what the user's role can
 * actually do.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle2,
  FileCheck2,
  Lock,
  LockOpen,
  Play,
  Receipt,
  Send,
  Wallet,
} from "lucide-react";
import { api, useAggregate, useResourceList, emptyQuery, type QueryState } from "@/lib/client";
import { formatMoney, formatNumber, currentPeriod, cn } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  Notice,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { GenericBars as BarChart, GenericDonut as DonutChart } from "@/components/charts";

interface PayrollPreview {
  period: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalOvertime: number;
  warnings: string[];
  lines: Record<string, number | string>[];
}

interface RunRow extends Record<string, unknown> {
  id: string;
  period: string;
  label: string;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  locked: boolean;
}

interface PayrollReports {
  rows: {
    label: string;
    employees: number;
    gross: number;
    deductions: number;
    net: number;
    professionalTax: number;
    providentFund: number;
    esi: number;
    tds: number;
    incentives: number;
    overtime: number;
    status: string;
  }[];
  dept: { name: string; headcount: number }[];
  period: string;
}

const STAGES = ["Draft", "Under Review", "Pending Approval", "Approved", "Finalized", "Paid"] as const;

export default function SalaryProcessingPage() {
  const [query] = useState<QueryState>({ ...emptyQuery, pageSize: 25, sort: "period", dir: "desc" });
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const reports = useAggregate<PayrollReports>("payroll-reports");
  const runs = useResourceList<RunRow>("payroll-runs", query);

  const rows = useMemo(() => runs.data?.rows ?? [], [runs.data]);
  const selectedRun = rows[0] ?? null;

  const act = async (name: string, body: Record<string, unknown>, success: string) => {
    setBusy(name);
    try {
      const res = await api.action<{ ok: boolean; message?: string }>(name, body);
      toast.success(res.message ?? success);
      runs.refetch();
      reports.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const openPreview = async () => {
    setBusy("payroll.preview");
    try {
      const res = await api.action<{ data: PayrollPreview }>("payroll.preview", { period });
      setPreview(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not compute a preview.");
    } finally {
      setBusy(null);
    }
  };

  if (reports.error) return <ErrorState message={reports.error} onRetry={reports.refetch} />;

  const chartRows = reports.data?.rows.filter((r) => r.employees > 0) ?? [];
  const latest = chartRows[chartRows.length - 1];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salary Processing"
        description="Compute, review, approve and finalise the monthly payroll run for the entire workforce."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openPreview} loading={busy === "payroll.preview"}>
              <Play className="h-3.5 w-3.5" /> Preview {period}
            </Button>
            <Button
              size="sm"
              loading={busy === "payroll.compute"}
              onClick={() => act("payroll.compute", { period }, `Payroll for ${period} computed.`)}
            >
              <Wallet className="h-3.5 w-3.5" /> Run Payroll
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly payroll trend</CardTitle>
            <CardDescription>Gross earnings against net payable across the last twelve periods.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.loading ? (
              <TableSkeleton rows={5} cols={4} />
            ) : (
              <BarChart
                data={chartRows}
                xKey="label"
                series={[
                  { key: "gross", label: "Gross", color: "var(--brand-500)" },
                  { key: "deductions", label: "Deductions", color: "var(--amber-500)" },
                  { key: "net", label: "Net Paid", color: "var(--mint-600)" },
                ]}
                height={260}
                formatValue={(v) => formatMoney(v, { compact: true })}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statutory split</CardTitle>
            <CardDescription>{latest ? `Deductions for ${latest.label}` : "No payroll run computed yet."}</CardDescription>
          </CardHeader>
          <CardContent>
            {latest ? (
              <DonutChart
                height={230}
                data={[
                  { name: "Professional Tax", value: latest.professionalTax },
                  { name: "Provident Fund", value: latest.providentFund },
                  { name: "ESI", value: latest.esi },
                  { name: "TDS", value: latest.tds },
                ].filter((d) => d.value > 0)}
                formatValue={(v) => formatMoney(v, { compact: true })}
                centerLabel="Total"
                centerValue={formatMoney(latest.deductions, { compact: true })}
              />
            ) : (
              <p className="py-12 text-center text-[13px] text-muted">Run payroll to see the statutory breakdown.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Period control */}
      <Card>
        <CardHeader>
          <CardTitle>Run control</CardTitle>
          <CardDescription>Choose the period to act on, then step the run through its lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-end">
            <div>
              <Label htmlFor="period">Payroll period</Label>
              <Input id="period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-03" className="mt-1" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"] as const).map((p) => (
                <Button key={p} variant={p === period ? "primary" : "outline"} size="sm" onClick={() => setPeriod(p)}>
                  <CalendarRange className="h-3.5 w-3.5" /> {p}
                </Button>
              ))}
            </div>
          </div>

          {selectedRun ? (
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold">
                    {selectedRun.label} · <StatusBadge value={selectedRun.status} />
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {formatNumber(selectedRun.totalEmployees)} employees · gross {formatMoney(selectedRun.totalGross)} · deductions{" "}
                    {formatMoney(selectedRun.totalDeductions)} · <span className="font-medium text-[var(--text)]">net {formatMoney(selectedRun.totalNet)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRun.status === "Draft" ? (
                    <Button size="sm" loading={busy === "payroll.advance"} onClick={() => act("payroll.advance", { runId: selectedRun.id }, "Run moved to review.")}>
                      <Send className="h-3.5 w-3.5" /> Send for review
                    </Button>
                  ) : null}
                  {selectedRun.status === "Under Review" ? (
                    <Button size="sm" loading={busy === "payroll.advance"} onClick={() => act("payroll.advance", { runId: selectedRun.id }, "Run submitted for approval.")}>
                      <Send className="h-3.5 w-3.5" /> Submit for approval
                    </Button>
                  ) : null}
                  {selectedRun.status === "Pending Approval" ? (
                    <Button size="sm" loading={busy === "payroll.advance"} onClick={() => act("payroll.advance", { runId: selectedRun.id }, "Run approved.")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve run
                    </Button>
                  ) : null}
                  {["Approved", "Finalized"].includes(selectedRun.status) ? (
                    <Button size="sm" loading={busy === "payroll.payslips"} onClick={() => act("payroll.payslips", { runId: selectedRun.id }, "Payslips generated.")}>
                      <FileCheck2 className="h-3.5 w-3.5" /> Generate payslips
                    </Button>
                  ) : null}
                  {selectedRun.status === "Finalized" ? (
                    <Button size="sm" loading={busy === "payroll.advance"} onClick={() => act("payroll.advance", { runId: selectedRun.id }, "Run marked as paid.")}>
                      <BadgeIndianRupee className="h-3.5 w-3.5" /> Mark paid
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                {STAGES.map((stage, i) => {
                  const currentIndex = STAGES.indexOf(selectedRun.status as (typeof STAGES)[number]);
                  const done = currentIndex >= i;
                  return (
                    <div key={stage} className="flex flex-1 items-center gap-1">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          done ? "bg-brand-500 text-white" : "bg-[var(--surface-3)] text-muted"
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className={cn("hidden truncate text-[11.5px] lg:block", done ? "text-[var(--text)]" : "text-muted")}>{stage}</span>
                      {i < STAGES.length - 1 ? <span className={cn("h-px flex-1", done ? "bg-brand-500/40" : "bg-[var(--border)]")} /> : null}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
                {selectedRun.locked ? <Lock className="h-3.3 w-3.3" /> : <LockOpen className="h-3.3 w-3.3" />}
                {selectedRun.locked ? "Run is locked — figures can no longer be edited." : "Run is open for adjustment."}
              </p>
            </div>
          ) : (
            <Notice tone="info">
              No payroll run exists for <strong>{period}</strong> yet. Use <strong>Run Payroll</strong> to compute it from live attendance,
              overtime and salary structures.
            </Notice>
          )}
        </CardContent>
      </Card>

      {/* Payroll runs table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll runs</CardTitle>
          <CardDescription>Every period processed on this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {runs.error ? (
            <ErrorState message={runs.error} onRetry={runs.refetch} />
          ) : runs.loading && !runs.data ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Period</TH>
                  <TH>Run</TH>
                  <TH align="right">Employees</TH>
                  <TH align="right">Gross</TH>
                  <TH align="right">Deductions</TH>
                  <TH align="right">Net Payable</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {(runs.data?.rows ?? []).map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{r.period}</code>
                    </TD>
                    <TD className="font-medium">{r.label}</TD>
                    <TD align="right">{formatNumber(r.totalEmployees)}</TD>
                    <TD align="right">{formatMoney(r.totalGross)}</TD>
                    <TD align="right">{formatMoney(r.totalDeductions)}</TD>
                    <TD align="right" className="font-medium">
                      {formatMoney(r.totalNet)}
                    </TD>
                    <TD>
                      <StatusBadge value={r.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={Boolean(preview)} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Payroll preview — {preview?.period}</DialogTitle>
            <DialogDescription>
              Computed from live attendance, overtime, salary structures and statutory configuration. Nothing is stored until you run payroll.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {preview ? (
              <>
                {preview.warnings.length ? (
                  <Notice tone="warning">
                    <p className="font-medium">Payroll warnings for {preview.period}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {preview.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Notice>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Employees", value: formatNumber(preview.totalEmployees) },
                    { label: "Gross", value: formatMoney(preview.totalGross, { compact: true }) },
                    { label: "Deductions", value: formatMoney(preview.totalDeductions, { compact: true }) },
                    { label: "Net payable", value: formatMoney(preview.totalNet, { compact: true }) },
                  ].map((s) => (
                    <div key={s.label} className="surface-card px-3 py-2.5">
                      <p className="text-[11.5px] text-muted">{s.label}</p>
                      <p className="text-[17px] font-semibold tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>
                <TableWrap className="max-h-[380px] overflow-y-auto">
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Employee</TH>
                      <TH align="right">Basic</TH>
                      <TH align="right">Incentives</TH>
                      <TH align="right">Overtime</TH>
                      <TH align="right">Gross</TH>
                      <TH align="right">Deductions</TH>
                      <TH align="right">Net</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {preview.lines.slice(0, 60).map((r, i) => (
                      <TR key={`${r.employeeId}-${i}`}>
                        <TD className="font-medium">{String(r.name ?? r.employeeId)}</TD>
                        <TD align="right">{formatMoney(r.basic as number)}</TD>
                        <TD align="right">{formatMoney(r.incentives as number)}</TD>
                        <TD align="right">{formatMoney(r.overtimeAmount as number)}</TD>
                        <TD align="right">{formatMoney(r.grossEarnings as number)}</TD>
                        <TD align="right">{formatMoney(r.totalDeductions as number)}</TD>
                        <TD align="right" className="font-medium">
                          {formatMoney(r.netSalary as number)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </TableWrap>
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button
              loading={busy === "payroll.compute"}
              onClick={async () => {
                await act("payroll.compute", { period }, `Payroll for ${period} computed.`);
                setPreview(null);
              }}
            >
              <Receipt className="h-4 w-4" /> Commit this run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
