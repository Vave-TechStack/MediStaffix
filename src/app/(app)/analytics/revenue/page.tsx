"use client";

/**
 * Revenue reports.
 *
 * Invoice ageing and collection performance per hospital, with a period table
 * showing projected against realised billing.
 */

import { useMemo } from "react";
import { useAggregate } from "@/lib/client";
import { downloadCsv, exportPdf, formatMoney, formatPercent, toCsv } from "@/lib/utils";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  KpiCard,
  PageHeader,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { AgingChart, GenericBars, RevenuePayrollChart } from "@/components/charts";

interface FinancePayload {
  rows: {
    month: string;
    label: string;
    projected: number;
    invoiced: number;
    collected: number;
    receivables: number;
    grossMargin: number;
  }[];
  profitability: {
    hospitalId: string;
    hospital: string;
    invoices: number;
    billed: number;
    collected: number;
    outstanding: number;
    grossMargin: number;
    marginPercent: number;
  }[];
  period: string;
}

interface DashboardPayload {
  charts: {
    aging: { bucket: string; amount: number; count: number }[];
    hospitalRevenue: { short: string; name: string; invoiced: number; collected: number; outstanding: number }[];
  };
  meta: { period: string };
}

export default function RevenueReportsPage() {
  const fin = useAggregate<FinancePayload>("finance");
  const dash = useAggregate<DashboardPayload>("dashboard");

  const totals = useMemo(() => {
    const rows = fin.data?.rows ?? [];
    const invoiced = rows.reduce((s, r) => s + r.invoiced, 0);
    const collected = rows.reduce((s, r) => s + r.collected, 0);
    const outstanding = (fin.data?.profitability ?? []).reduce((s, p) => s + p.outstanding, 0);
    return { invoiced, collected, outstanding, rate: invoiced ? collected / invoiced : 0 };
  }, [fin.data]);

  const exportRows = () => {
    const rows = (fin.data?.rows ?? []).map((r) => ({
      month: r.label,
      projected: r.projected,
      invoiced: r.invoiced,
      collected: r.collected,
      receivables: r.receivables,
      grossMargin: r.grossMargin,
    }));
    downloadCsv(
      `revenue-report-${new Date().toISOString().slice(0, 10)}`,
      toCsv(rows, [
        { key: "month", label: "Month" },
        { key: "projected", label: "Projected" },
        { key: "invoiced", label: "Invoiced" },
        { key: "collected", label: "Collected" },
        { key: "receivables", label: "Receivables" },
        { key: "grossMargin", label: "Gross margin" },
      ])
    );
  };

  if (fin.error) return <ErrorState message={fin.error} onRetry={fin.refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue Reports"
        description="Billing, collection and receivables performance by period and by client hospital."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportRows}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPdf("revenue-reports", "Revenue Reports")}>
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total invoiced" value={formatMoney(totals.invoiced, { compact: true })} sub="Across every period on record" tone="brand" />
        <KpiCard label="Total collected" value={formatMoney(totals.collected, { compact: true })} sub={`${formatPercent(totals.rate)} collection rate`} tone="success" />
        <KpiCard label="Outstanding" value={formatMoney(totals.outstanding, { compact: true })} sub="Open receivables on all hospitals" tone="warning" />
        <KpiCard label="Overdue invoices" value={dash.data?.charts.aging.filter((a) => a.bucket !== "Not due").reduce((s, a) => s + a.count, 0) ?? 0} sub="Past the agreed payment term" tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue, collections and cost</CardTitle>
          <CardDescription>Invoiced and collected revenue against payroll cost, by month.</CardDescription>
        </CardHeader>
        <CardContent>
          {fin.loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <RevenuePayrollChart
              data={(fin.data?.rows ?? []).map((r) => ({ label: r.label, invoiced: r.invoiced, collected: r.collected, payroll: 0 }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice ageing</CardTitle>
            <CardDescription>Outstanding value bucketed by how long it has been due.</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.loading ? <TableSkeleton rows={5} cols={2} /> : <AgingChart data={dash.data?.charts.aging ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projected vs invoiced</CardTitle>
            <CardDescription>Contracted monthly billing against what was actually raised.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericBars
              data={(fin.data?.rows ?? []) as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "projected", label: "Projected" },
                { key: "invoiced", label: "Invoiced" },
                { key: "collected", label: "Collected" },
              ]}
              height={250}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Period detail</CardTitle>
          <CardDescription>Billing, collection and receivables by month.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {fin.loading ? (
            <TableSkeleton rows={10} cols={6} />
          ) : (
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Month</TH>
                  <TH align="right">Projected</TH>
                  <TH align="right">Invoiced</TH>
                  <TH align="right">Collected</TH>
                  <TH align="right">Receivables</TH>
                  <TH align="right">Gross margin</TH>
                </TR>
              </THead>
              <TBody>
                {[...(fin.data?.rows ?? [])].reverse().map((r) => (
                  <TR key={r.month}>
                    <TD className="font-medium">{r.label}</TD>
                    <TD align="right">{formatMoney(r.projected)}</TD>
                    <TD align="right">{formatMoney(r.invoiced)}</TD>
                    <TD align="right">{formatMoney(r.collected)}</TD>
                    <TD align="right" className={r.receivables > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted"}>
                      {formatMoney(r.receivables)}
                    </TD>
                    <TD align="right" className="font-medium">
                      {formatMoney(r.grossMargin)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection by hospital</CardTitle>
          <CardDescription>Who pays on time, and where receivables are concentrated.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {fin.loading ? (
            <TableSkeleton rows={10} cols={5} />
          ) : (
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Hospital</TH>
                  <TH align="right">Invoices</TH>
                  <TH align="right">Billed</TH>
                  <TH align="right">Collected</TH>
                  <TH align="right">Outstanding</TH>
                  <TH align="right">Collection</TH>
                </TR>
              </THead>
              <TBody>
                {[...(fin.data?.profitability ?? [])]
                  .sort((a, b) => b.outstanding - a.outstanding)
                  .map((p) => (
                    <TR key={p.hospitalId}>
                      <TD className="font-medium">{p.hospital}</TD>
                      <TD align="right">{p.invoices}</TD>
                      <TD align="right">{formatMoney(p.billed)}</TD>
                      <TD align="right">{formatMoney(p.collected)}</TD>
                      <TD align="right" className={p.outstanding > 0 ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted"}>
                        {formatMoney(p.outstanding)}
                      </TD>
                      <TD align="right">{p.billed ? formatPercent(p.collected / p.billed) : "—"}</TD>
                    </TR>
                  ))}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
