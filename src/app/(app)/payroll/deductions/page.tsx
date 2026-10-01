"use client";

import { useMemo } from "react";
import { ResourcePage } from "@/components/resource/resource-page";
import { useAggregate } from "@/lib/client";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { GenericDonut } from "@/components/charts";

interface Reports {
  rows: { label: string; professionalTax: number; providentFund: number; esi: number; tds: number; deductions: number }[];
  period: string;
}

export default function DeductionsPage() {
  const reports = useAggregate<Reports>("payroll-reports");

  const stats = useMemo(() => {
    const rows = (reports.data?.rows ?? []).filter((r) => r.deductions > 0);
    const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const total = sum("deductions");
    const breakdown = [
      { name: "Provident Fund", value: sum("providentFund") },
      { name: "Professional Tax", value: sum("professionalTax") },
      { name: "TDS", value: sum("tds") },
      { name: "ESI", value: sum("esi") },
    ];
    const statutory = breakdown.reduce((s, b) => s + b.value, 0);
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Statutory composition</CardTitle>
            <CardDescription>
              Professional tax, provident fund, ESI and TDS are computed from the configurable policy in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenericDonut data={breakdown} centerLabel="Statutory total" centerValue={formatMoney(statutory, { compact: true })} height={250} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Other deductions</CardTitle>
            <CardDescription>Advance recovery, absence loss of pay and one-off recoveries.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total deductions", value: total },
                { label: "Statutory share", value: statutory },
                { label: "Other / recovery", value: Math.max(0, total - statutory) },
                { label: "Average per period", value: rows.length ? total / rows.length : 0 },
              ].map((s) => (
                <div key={s.label} className="surface-card px-3 py-3">
                  <p className="text-[11.5px] text-muted">{s.label}</p>
                  <p className="mt-1 text-[19px] font-semibold tabular-nums">{formatMoney(s.value, { compact: true })}</p>
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
      resource="payroll-items"
      title="Deductions"
      description="Statutory and non-statutory deductions computed per employee for every payroll period."
      columnKeys={["employeeId", "professionalTax", "providentFund", "esi", "tds", "otherDeductions", "advanceRecovery", "totalDeductions", "netSalary"]}
      stats={() => stats}
      exportName="payroll-deductions"
    />
  );
}
