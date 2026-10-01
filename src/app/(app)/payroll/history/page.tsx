"use client";

import { useMemo } from "react";
import { ResourcePage } from "@/components/resource/resource-page";
import { useAggregate } from "@/lib/client";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { GenericBars } from "@/components/charts";

interface Reports {
  rows: { label: string; employees: number; gross: number; deductions: number; net: number; status: string }[];
}

export default function PayrollHistoryPage() {
  const reports = useAggregate<Reports>("payroll-reports");

  const stats = useMemo(() => {
    const rows = reports.data?.rows ?? [];
    const processed = rows.filter((r) => r.employees > 0);
    const totalNet = processed.reduce((s, r) => s + r.net, 0);
    const totalGross = processed.reduce((s, r) => s + r.gross, 0);
    return (
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payroll cost history</CardTitle>
            <CardDescription>Gross and net cost of payroll by period.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericBars
              data={processed as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "gross", label: "Gross" },
                { key: "deductions", label: "Deductions" },
                { key: "net", label: "Net Paid" },
              ]}
              height={250}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lifetime totals</CardTitle>
            <CardDescription>Across {processed.length} processed periods.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total gross cost", value: totalGross },
                { label: "Total net paid", value: totalNet },
                { label: "Total withheld", value: Math.max(0, totalGross - totalNet) },
              ].map((s) => (
                <div key={s.label} className="surface-card flex items-center justify-between px-3 py-3">
                  <span className="text-[12.5px] text-muted">{s.label}</span>
                  <span className="text-[16px] font-semibold tabular-nums">{formatMoney(s.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [reports.data]);

  return (
    <ResourcePage
      resource="payroll-runs"
      title="Payroll History"
      description="Every monthly payroll run with its approval trail, cost totals and finalisation state."
      defaultSort="period"
      hideFilters={["notes"]}
      stats={() => stats}
      exportName="payroll-history"
    />
  );
}
