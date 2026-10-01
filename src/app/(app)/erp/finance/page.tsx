"use client";

/**
 * Finance overview.
 *
 * Reads the finance aggregate: monthly revenue against payroll and expenses,
 * per-hospital profitability and the expense mix. Every figure is derived from
 * live invoices, payroll runs and approved expenses.
 */

import { useMemo, useState } from "react";
import { exportPdf, formatMoney, formatPercent } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  KpiCard,
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
import { GenericBars, GenericDonut, HorizontalBars } from "@/components/charts";
import { useAggregate } from "@/lib/client";

interface FinancePayload {
  rows: {
    month: string;
    label: string;
    projected: number;
    invoiced: number;
    collected: number;
    payroll: number;
    expenses: number;
    grossMargin: number;
    operatingSurplus: number;
    receivables: number;
  }[];
  profitability: {
    hospitalId: string;
    hospital: string;
    invoices: number;
    billed: number;
    collected: number;
    outstanding: number;
    doctorCost: number;
    grossMargin: number;
    marginPercent: number;
    deployments: number;
  }[];
  expenseBreakdown: { name: string; value: number }[];
  period: string;
}

export default function FinanceOverviewPage() {
  const { data, loading, error, refetch } = useAggregate<FinancePayload>("finance");
  const [sortBy, setSortBy] = useState<"hospital" | "revenue" | "margin">("revenue");

  const current = data?.rows.find((r) => r.label === data.period) ?? data?.rows[data.rows.length - 1];
  const totals = useMemo(() => {
    const rows = data?.rows ?? [];
    const invoiced = rows.reduce((s, r) => s + r.invoiced, 0);
    const collected = rows.reduce((s, r) => s + r.collected, 0);
    const payroll = rows.reduce((s, r) => s + r.payroll, 0);
    const expenses = rows.reduce((s, r) => s + r.expenses, 0);
    return { invoiced, collected, payroll, expenses, margin: invoiced - payroll, receivables: invoiced - collected };
  }, [data]);

  const profitability = useMemo(() => {
    const list = [...(data?.profitability ?? [])];
    if (sortBy === "hospital") list.sort((a, b) => a.hospital.localeCompare(b.hospital));
    else if (sortBy === "margin") list.sort((a, b) => b.grossMargin - a.grossMargin);
    else list.sort((a, b) => b.billed - a.billed);
    return list;
  }, [data, sortBy]);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance Overview"
        description="Revenue, payroll cost and operating surplus by month, with profitability for every client hospital."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportPdf("finance-overview", "Finance Overview")}>
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={`Invoiced · ${data?.period ?? ""}`} value={formatMoney(current?.invoiced ?? 0, { compact: true })} sub={`Projected ${formatMoney(current?.projected ?? 0, { compact: true })}`} tone="brand" />
        <KpiCard label="Collected" value={formatMoney(current?.collected ?? 0, { compact: true })} sub={current?.invoiced ? `${formatPercent(current.collected / current.invoiced)} of invoiced` : "No invoices yet"} tone="success" />
        <KpiCard label="Receivables" value={formatMoney(current?.receivables ?? 0, { compact: true })} sub="Invoiced but not collected" tone="warning" />
        <KpiCard label="Payroll cost" value={formatMoney(current?.payroll ?? 0, { compact: true })} sub="Net salary cost for the period" tone="info" />
        <KpiCard label="Operating expenses" value={formatMoney(current?.expenses ?? 0, { compact: true })} sub="Approved and reimbursed" tone="danger" />
        <KpiCard
          label="Gross margin"
          value={formatMoney(current?.grossMargin ?? 0, { compact: true })}
          sub={current?.invoiced ? `${formatPercent(current.grossMargin / current.invoiced)} of invoiced` : "No revenue yet"}
          tone="brand"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue against cost</CardTitle>
          <CardDescription>Invoiced and collected revenue versus payroll and expense cost, by month.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <GenericBars
              data={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "invoiced", label: "Invoiced" },
                { key: "collected", label: "Collected" },
                { key: "payroll", label: "Payroll" },
                { key: "expenses", label: "Expenses" },
              ]}
              height={300}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly margin &amp; surplus</CardTitle>
            <CardDescription>Gross margin after payroll and operating surplus after expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericBars
              data={(data?.rows ?? []) as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "grossMargin", label: "Gross margin" },
                { key: "operatingSurplus", label: "Operating surplus" },
              ]}
              height={240}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>Approved and reimbursed expenses by category.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.expenseBreakdown.length ? (
              <>
                <GenericDonut data={data.expenseBreakdown} height={210} />
                <div className="mt-3">
                  <HorizontalBars data={data.expenseBreakdown.slice(0, 8)} />
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-[13px] text-muted">No approved expenses recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hospital profitability</CardTitle>
          <CardDescription>
            Lifetime billing against salary cost per client hospital, with the resulting contribution margin.
          </CardDescription>
          <div className="flex gap-1.5 pt-2">
            {(["revenue", "margin", "hospital"] as const).map((s) => (
              <Button key={s} size="sm" variant={sortBy === s ? "primary" : "outline"} onClick={() => setSortBy(s)}>
                {s === "revenue" ? "By revenue" : s === "margin" ? "By margin" : "By name"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Hospital</TH>
                  <TH align="right">Deployments</TH>
                  <TH align="right">Revenue</TH>
                  <TH align="right">Salary cost</TH>
                  <TH align="right">Margin</TH>
                  <TH align="right">Margin %</TH>
                  <TH>Health</TH>
                </TR>
              </THead>
              <TBody>
                {profitability.map((p) => (
                  <TR key={p.hospitalId}>
                    <TD className="font-medium">{p.hospital}</TD>
                    <TD align="right">{p.deployments}</TD>
                    <TD align="right">{formatMoney(p.billed)}</TD>
                    <TD align="right">{formatMoney(p.doctorCost)}</TD>
                    <TD align="right" className="font-medium">
                      {formatMoney(p.grossMargin)}
                    </TD>
                    <TD align="right">{formatPercent(p.marginPercent)}</TD>
                    <TD>
                      <StatusBadge value={p.marginPercent >= 20 ? "Healthy" : p.marginPercent >= 10 ? "Watch" : "Marginal"} />
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
          <CardTitle>Twelve-month totals</CardTitle>
          <CardDescription>Cumulative across every period on record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total invoiced", value: totals.invoiced, tone: "brand" as const },
            { label: "Total collected", value: totals.collected, tone: "success" as const },
            { label: "Total payroll", value: totals.payroll, tone: "info" as const },
            { label: "Total expenses", value: totals.expenses, tone: "danger" as const },
            { label: "Total receivables", value: totals.receivables, tone: "warning" as const },
          ].map((s) => (
            <div key={s.label} className="surface-card px-3 py-3">
              <p className="text-[11.5px] text-muted">{s.label}</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums">{formatMoney(s.value, { compact: true })}</p>
              <Badge tone={s.tone} size="sm">
                {s.label.replace("Total ", "")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
