"use client";

/**
 * Payroll reports.
 *
 * Statutory and cost analysis of the payroll run, with a per-employee sample
 * showing payable days against loss of pay so payroll exceptions surface here
 * rather than in a payslip dispute.
 */

import { useMemo, useState } from "react";
import { useAggregate } from "@/lib/client";
import { downloadCsv, exportPdf, formatMoney, formatNumber, formatPercent, toCsv } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  KpiCard,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  Toolbar,
  TR,
} from "@/components/ui";
import { GenericBars, GenericDonut, HorizontalBars } from "@/components/charts";

interface PayrollReports {
  rows: {
    month: string;
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
  sample: {
    employeeId: string;
    code: string;
    name: string;
    designation: string;
    department: string;
    monthlyCtc: number;
    presentDays: number;
    absentDays: number;
    overtimeHours: number;
  }[];
  period: string;
}

export default function PayrollReportsPage() {
  const { data, loading, error, refetch } = useAggregate<PayrollReports>("payroll-reports");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");

  const processed = useMemo(() => (data?.rows ?? []).filter((r) => r.employees > 0), [data]);
  const latest = processed[processed.length - 1];

  const totals = useMemo(() => {
    const sum = (k: keyof (typeof processed)[number]) => processed.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    return {
      gross: sum("gross"),
      deductions: sum("deductions"),
      net: sum("net"),
      pt: sum("professionalTax"),
      pf: sum("providentFund"),
      esi: sum("esi"),
      tds: sum("tds"),
      incentives: sum("incentives"),
      overtime: sum("overtime"),
      employees: sum("employees"),
    };
  }, [processed]);

  const sample = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.sample ?? []).filter((s) => {
      if (dept && s.department !== dept) return false;
      if (!needle) return true;
      return [s.name, s.code, s.designation, s.department].join(" ").toLowerCase().includes(needle);
    });
  }, [data, q, dept]);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Reports"
        description={`Cost, statutory and attendance analysis of payroll for ${data?.period ?? "the current period"}.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `payroll-report-${new Date().toISOString().slice(0, 10)}`,
                  toCsv(processed as unknown as Record<string, unknown>[], [
                    { key: "label", label: "Month" },
                    { key: "employees", label: "Employees" },
                    { key: "gross", label: "Gross" },
                    { key: "deductions", label: "Deductions" },
                    { key: "net", label: "Net paid" },
                    { key: "professionalTax", label: "Professional tax" },
                    { key: "providentFund", label: "Provident fund" },
                    { key: "esi", label: "ESI" },
                    { key: "tds", label: "TDS" },
                  ])
                )
              }
            >
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPdf("payroll-reports", "Payroll Reports")}>
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total gross cost" value={formatMoney(totals.gross, { compact: true })} sub={`${formatNumber(totals.employees)} employee-months`} tone="brand" />
        <KpiCard label="Total net paid" value={formatMoney(totals.net, { compact: true })} sub={`${totals.gross ? formatPercent(totals.net / totals.gross) : "—"} of gross`} tone="success" />
        <KpiCard label="Provident fund" value={formatMoney(totals.pf, { compact: true })} sub="Employee + employer withheld" tone="info" />
        <KpiCard label="Professional tax" value={formatMoney(totals.pt, { compact: true })} sub="Monthly per employee" tone="info" />
        <KpiCard label="TDS" value={formatMoney(totals.tds, { compact: true })} sub="Deducted at source" tone="warning" />
        <KpiCard label="ESI" value={formatMoney(totals.esi, { compact: true })} sub="Below the wage ceiling" tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll cost by month</CardTitle>
          <CardDescription>Gross, deductions and net payable across the last twelve periods.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <GenericBars
              data={processed as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "gross", label: "Gross" },
                { key: "deductions", label: "Deductions" },
                { key: "net", label: "Net paid" },
              ]}
              height={280}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Statutory composition</CardTitle>
            <CardDescription>{latest ? `For ${latest.label}` : "No payroll run processed yet"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericDonut
              data={[
                { name: "Provident Fund", value: totals.pf },
                { name: "Professional Tax", value: totals.pt },
                { name: "TDS", value: totals.tds },
                { name: "ESI", value: totals.esi },
              ].filter((d) => d.value > 0)}
              centerLabel="Total withheld"
              centerValue={formatMoney(totals.deductions, { compact: true })}
              height={250}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variable pay</CardTitle>
            <CardDescription>Incentives and overtime paid above contracted salary.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={[
                { name: "Incentives", value: totals.incentives },
                { name: "Overtime", value: totals.overtime },
                { name: "Statutory deductions", value: totals.deductions },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Headcount by department</CardTitle>
            <CardDescription>Where payroll cost is concentrated.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={(data?.dept ?? []).slice(0, 8).map((d) => ({ name: d.name, value: d.headcount }))}
              valueFormat={(v) => `${v} staff`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee attendance impact</CardTitle>
          <CardDescription>
            Present days, absences and overtime per employee for {data?.period}. Loss of pay days are derived at payroll time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toolbar>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee, code or designation…" className="min-w-[220px] flex-1" />
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="rounded-lg border px-3 py-2 text-[13.5px]"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {(data?.dept ?? []).map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Toolbar>

          {loading ? (
            <TableSkeleton rows={10} cols={6} />
          ) : sample.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted">No employees match this filter.</p>
          ) : (
            <TableWrap className="max-h-[520px] overflow-y-auto">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Employee</TH>
                  <TH>Designation</TH>
                  <TH align="right">Monthly CTC</TH>
                  <TH align="right">Present</TH>
                  <TH align="right">Absent</TH>
                  <TH align="right">Overtime</TH>
                  <TH align="right">Flag</TH>
                </TR>
              </THead>
              <TBody>
                {sample.slice(0, 120).map((s) => {
                  const total = s.presentDays + s.absentDays;
                  const rate = total ? s.presentDays / total : 1;
                  return (
                    <TR key={s.employeeId}>
                      <TD>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-2 text-[11.5px] text-muted">{s.code}</span>
                      </TD>
                      <TD>{s.designation}</TD>
                      <TD align="right">{formatMoney(s.monthlyCtc)}</TD>
                      <TD align="right">{s.presentDays}</TD>
                      <TD align="right" className={s.absentDays > 2 ? "text-amber-600 dark:text-amber-400" : undefined}>
                        {s.absentDays}
                      </TD>
                      <TD align="right">{s.overtimeHours} hrs</TD>
                      <TD align="right">
                        <StatusBadge value={rate >= 0.95 ? "Regular" : rate >= 0.85 ? "Review" : "Exception"} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
