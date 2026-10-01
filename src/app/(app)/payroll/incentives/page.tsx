"use client";

import { useMemo } from "react";
import { ResourcePage } from "@/components/resource/resource-page";
import { useAggregate } from "@/lib/client";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { GenericBars } from "@/components/charts";

interface Reports {
  rows: { label: string; incentives: number; overtime: number; net: number }[];
  period: string;
}

export default function IncentivesPage() {
  const reports = useAggregate<Reports>("payroll-reports");
  const stats = useMemo(() => {
    const withData = (reports.data?.rows ?? []).filter((r) => r.incentives > 0 || r.overtime > 0);
    const totalIncentives = withData.reduce((s, r) => s + r.incentives, 0);
    const totalOvertime = withData.reduce((s, r) => s + r.overtime, 0);
    return (
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Incentive &amp; overtime payouts</CardTitle>
            <CardDescription>Performance and attendance incentives paid each period alongside overtime earnings.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericBars
              data={withData as unknown as Record<string, unknown>[]}
              xKey="label"
              series={[
                { key: "incentives", label: "Incentives" },
                { key: "overtime", label: "Overtime" },
              ]}
              stacked
              height={240}
              formatValue={(v) => formatMoney(v, { compact: true })}
            />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total incentives</CardTitle>
              <CardDescription>Across every period on record.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[26px] font-semibold tabular-nums">{formatMoney(totalIncentives)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total overtime earnings</CardTitle>
              <CardDescription>Paid on top of contracted salary.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[26px] font-semibold tabular-nums">{formatMoney(totalOvertime)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }, [reports.data]);

  return (
    <ResourcePage
      resource="payroll-items"
      title="Incentives"
      description="Performance incentives and overtime earnings per employee, produced by the payroll engine."
      columnKeys={["employeeId", "incentives", "overtimeAmount", "arrears", "reimbursements", "grossEarnings", "netSalary", "payableDays", "lossOfPayDays"]}
      stats={() => stats}
      exportName="payroll-incentives"
    />
  );
}
