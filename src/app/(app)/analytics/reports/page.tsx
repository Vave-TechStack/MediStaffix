"use client";

/**
 * Business reports.
 *
 * Rolls up the CRM, workforce and revenue aggregates into one operations review
 * so an owner can see pipeline, coverage and money together.
 */

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAggregate } from "@/lib/client";
import { exportPdf, formatMoney, formatNumber, formatPercent } from "@/lib/utils";
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
import { CategoryDonut, DeploymentTrendChart, FunnelChart, HospitalRevenueChart } from "@/components/charts";

interface DashboardPayload {
  kpis: { key: string; label: string; value: string | number; sub: string; tone: string; money?: boolean }[];
  charts: {
    deploymentTrend: { label: string; active: number; added: number; ended: number }[];
    hospitalRevenue: { short: string; name: string; invoiced: number; collected: number; outstanding: number }[];
    funnel: { stage: string; count: number }[];
    categoryDist: { name: string; value: number }[];
  };
  meta: { period: string; generatedAt: string; role: string };
}

interface RecruitmentPayload {
  sources: { name: string; candidates: number; applications: number; shortlisted: number; offers: number; joined: number; conversionRate: number }[];
  rejectionReasons: { name: string; value: number }[];
  timeToHire: { name: string; job: string; days: number }[];
}

export default function BusinessReportsPage() {
  const dash = useAggregate<DashboardPayload>("dashboard");
  const rec = useAggregate<RecruitmentPayload>("recruitment");

  const totals = useMemo(() => {
    const sources = rec.data?.sources ?? [];
    return {
      candidates: sources.reduce((s, r) => s + r.candidates, 0),
      applications: sources.reduce((s, r) => s + r.applications, 0),
      joined: sources.reduce((s, r) => s + r.joined, 0),
      offers: sources.reduce((s, r) => s + r.offers, 0),
      avgTimeToHire: rec.data?.timeToHire.length
        ? Math.round((rec.data.timeToHire.reduce((s, t) => s + t.days, 0) / rec.data.timeToHire.length) * 10) / 10
        : 0,
    };
  }, [rec.data]);

  if (dash.error) return <ErrorState message={dash.error} onRetry={dash.refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business Reports"
        description={`Operating review across pipeline, workforce and revenue for ${dash.data?.meta.period ?? "the current period"}.`}
        actions={
          <Button variant="outline" size="sm" onClick={() => exportPdf("business-reports", "Business Reports")}>
            Export PDF
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {(dash.data?.kpis ?? []).slice(0, 6).map((k) => (
          <KpiCard key={k.key} label={k.label} value={k.money ? formatMoney(k.value, { compact: true }) : formatNumber(k.value)} sub={k.sub} tone={k.tone as "brand"} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recruitment funnel</CardTitle>
            <CardDescription>Applications reaching each stage of the hiring pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.loading ? <TableSkeleton rows={6} cols={2} /> : <FunnelChart data={dash.data?.charts.funnel ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment trend</CardTitle>
            <CardDescription>Active placements against starts and completions each month.</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.loading ? <TableSkeleton rows={6} cols={3} /> : <DeploymentTrendChart data={dash.data?.charts.deploymentTrend ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by hospital</CardTitle>
            <CardDescription>Top billing hospitals for the current period.</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.loading ? <TableSkeleton rows={6} cols={4} /> : <HospitalRevenueChart data={dash.data?.charts.hospitalRevenue ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workforce mix</CardTitle>
            <CardDescription>Registered doctors grouped by primary staffing category.</CardDescription>
          </CardHeader>
          <CardContent>
            {dash.loading ? <TableSkeleton rows={6} cols={2} /> : <CategoryDonut data={dash.data?.charts.categoryDist ?? []} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate sourcing effectiveness</CardTitle>
          <CardDescription>Which channels actually convert, not just which ones deliver volume.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rec.loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Source</TH>
                  <TH align="right">Candidates</TH>
                  <TH align="right">Applications</TH>
                  <TH align="right">Shortlisted</TH>
                  <TH align="right">Offers</TH>
                  <TH align="right">Joined</TH>
                  <TH align="right">Conversion</TH>
                </TR>
              </THead>
              <TBody>
                {(rec.data?.sources ?? []).map((s) => (
                  <TR key={s.name}>
                    <TD className="font-medium">{s.name}</TD>
                    <TD align="right">{formatNumber(s.candidates)}</TD>
                    <TD align="right">{formatNumber(s.applications)}</TD>
                    <TD align="right">{formatNumber(s.shortlisted)}</TD>
                    <TD align="right">{formatNumber(s.offers)}</TD>
                    <TD align="right">{formatNumber(s.joined)}</TD>
                    <TD align="right">
                      <Badge tone={s.conversionRate >= 20 ? "success" : s.conversionRate >= 8 ? "warning" : "neutral"} size="sm">
                        {formatPercent(s.conversionRate)}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fastest hires</CardTitle>
            <CardDescription>Time from application to joining, in days.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <TableWrap>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Candidate</TH>
                  <TH>Requisition</TH>
                  <TH align="right">Days to hire</TH>
                  <TH align="right">Status</TH>
                </TR>
              </THead>
              <TBody>
                {(rec.data?.timeToHire ?? []).map((t, i) => (
                  <TR key={`${t.name}-${i}`}>
                    <TD className="font-medium">{t.name}</TD>
                    <TD>
                      <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{t.job}</code>
                    </TD>
                    <TD align="right">{t.days}</TD>
                    <TD align="right">
                      <StatusBadge value={t.days <= 20 ? "Fast" : t.days <= 45 ? "Typical" : "Slow"} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableWrap>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hiring summary</CardTitle>
            <CardDescription>Aggregate pipeline health across all sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Candidates in pool", value: formatNumber(totals.candidates) },
              { label: "Applications raised", value: formatNumber(totals.applications) },
              { label: "Offers issued", value: formatNumber(totals.offers) },
              { label: "Joined MediStaffix", value: formatNumber(totals.joined) },
              { label: "Average days to hire", value: `${totals.avgTimeToHire} days` },
            ].map((s) => (
              <div key={s.label} className="surface-card flex items-center justify-between px-3 py-2.5">
                <span className="text-[12.5px] text-muted">{s.label}</span>
                <span className="text-[15px] font-semibold tabular-nums">{s.value}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/analytics/recruitment">
                <span className="flex w-full items-center justify-center gap-1.5">
                  Full recruitment report
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rejection reasons</CardTitle>
          <CardDescription>Why applications were declined — the fastest lever on pipeline quality.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(rec.data?.rejectionReasons ?? []).map((r) => (
            <div key={r.name} className="surface-card flex items-center justify-between px-3 py-2.5">
              <span className="truncate text-[12.5px]">{r.name}</span>
              <span className="text-[14px] font-semibold tabular-nums">{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
