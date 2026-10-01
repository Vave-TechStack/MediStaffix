"use client";

/**
 * Recruitment reports.
 *
 * Funnel conversion, sourcing effectiveness, requisition fill rate and time to
 * hire — the four numbers that decide whether the pipeline is actually working.
 */

import { useMemo, useState } from "react";
import { useAggregate } from "@/lib/client";
import { exportPdf, formatDate, formatNumber, formatPercent } from "@/lib/utils";
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
import { FunnelChart, GenericBars, GenericDonut, HorizontalBars } from "@/components/charts";

interface RecruitmentReports {
  funnel: { stage: string; count: number }[];
  sources: { name: string; candidates: number; applications: number; shortlisted: number; offers: number; joined: number; conversionRate: number }[];
  timeToHire: { name: string; job: string; days: number; appliedAt: string; joinedAt: string }[];
  byRequisition: {
    jobCode: string;
    hospital: string;
    designation: string;
    vacancies: number;
    filled: number;
    applications: number;
    status: string;
    priority: string;
  }[];
  rejectionReasons: { name: string; value: number }[];
}

export default function RecruitmentReportsPage() {
  const { data, loading, error, refetch } = useAggregate<RecruitmentReports>("recruitment");
  const [sort, setSort] = useState<"fill" | "apps" | "name">("fill");

  const totals = useMemo(() => {
    const s = data?.sources ?? [];
    const joined = s.reduce((a, r) => a + r.joined, 0);
    const applications = s.reduce((a, r) => a + r.applications, 0);
    const candidates = s.reduce((a, r) => a + r.candidates, 0);
    const tth = data?.timeToHire ?? [];
    const reqs = data?.byRequisition ?? [];
    const vacancies = reqs.reduce((a, r) => a + r.vacancies, 0);
    const filled = reqs.reduce((a, r) => a + r.filled, 0);
    return {
      candidates,
      applications,
      joined,
      applicationRate: candidates ? applications / candidates : 0,
      avgTimeToHire: tth.length ? Math.round((tth.reduce((a, t) => a + t.days, 0) / tth.length) * 10) / 10 : 0,
      vacancies,
      fillRate: vacancies ? filled / vacancies : 0,
    };
  }, [data]);

  const requisitions = useMemo(() => {
    const list = [...(data?.byRequisition ?? [])];
    if (sort === "fill") list.sort((a, b) => a.filled / Math.max(1, a.vacancies) - b.filled / Math.max(1, b.vacancies));
    else if (sort === "apps") list.sort((a, b) => b.applications - a.applications);
    else list.sort((a, b) => a.jobCode.localeCompare(b.jobCode));
    return list;
  }, [data, sort]);

  const stages = data?.funnel ?? [];
  const applied = stages[0]?.count ?? 0;
  const joined = stages[stages.length - 1]?.count ?? 0;

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recruitment Reports"
        description="Pipeline conversion, sourcing effectiveness, fill rate and time to hire across every requisition."
        actions={
          <Button variant="outline" size="sm" onClick={() => exportPdf("recruitment-reports", "Recruitment Reports")}>
            Export PDF
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Candidates in pool" value={formatNumber(totals.candidates)} sub={`${formatPercent(totals.applicationRate)} applied somewhere`} tone="brand" />
        <KpiCard label="Applications" value={formatNumber(totals.applications)} sub="Across all requisitions" tone="info" />
        <KpiCard label="Joined" value={formatNumber(totals.joined)} sub={`${applied ? formatPercent(joined / applied) : "—"} end-to-end conversion`} tone="success" />
        <KpiCard label="Average days to hire" value={`${totals.avgTimeToHire}`} sub="Application to joining" tone="warning" />
        <KpiCard label="Open vacancies" value={formatNumber(totals.vacancies)} sub="Across tracked requisitions" tone="danger" />
        <KpiCard label="Fill rate" value={formatPercent(totals.fillRate)} sub={`${totals.vacancies - Math.round(totals.fillRate * totals.vacancies)} still unfilled`} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
            <CardDescription>Cumulative candidates reaching each hiring stage.</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <TableSkeleton rows={8} cols={2} /> : <FunnelChart data={data?.funnel ?? []} />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sourcing mix</CardTitle>
            <CardDescription>Where candidates originally came from.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={2} />
            ) : (
              <>
                <GenericDonut data={(data?.sources ?? []).map((s) => ({ name: s.name, value: s.candidates }))} height={210} />
                <div className="mt-3">
                  <HorizontalBars data={(data?.sources ?? []).map((s) => ({ name: s.name, value: s.candidates }))} valueFormat={(v) => `${v} candidates`} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion by source</CardTitle>
          <CardDescription>Volume alone is not performance — this compares joins against applications per channel.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <GenericBars
              data={(data?.sources ?? []) as unknown as Record<string, unknown>[]}
              xKey="name"
              series={[
                { key: "applications", label: "Applications" },
                { key: "shortlisted", label: "Shortlisted" },
                { key: "offers", label: "Offers" },
                { key: "joined", label: "Joined" },
              ]}
              height={260}
              formatValue={(v) => String(Math.round(v))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requisition fill rate</CardTitle>
          <CardDescription>
            <span className="mr-2 inline-flex gap-1.5">
              {(["fill", "apps", "name"] as const).map((s) => (
                <Button key={s} size="sm" variant={sort === s ? "primary" : "outline"} onClick={() => setSort(s)}>
                  {s === "fill" ? "Lowest fill" : s === "apps" ? "Most applications" : "By code"}
                </Button>
              ))}
            </span>
            Positions filled against vacancies raised, weakest first.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={10} cols={7} />
          ) : (
            <TableWrap className="max-h-[520px] overflow-y-auto">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Code</TH>
                  <TH>Hospital</TH>
                  <TH>Designation</TH>
                  <TH align="right">Vacancies</TH>
                  <TH align="right">Filled</TH>
                  <TH align="right">Applications</TH>
                  <TH align="right">Fill</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {requisitions.map((r) => {
                  const fill = r.vacancies ? r.filled / r.vacancies : 1;
                  return (
                    <TR key={r.jobCode}>
                      <TD>
                        <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{r.jobCode}</code>
                      </TD>
                      <TD>{r.hospital}</TD>
                      <TD className="font-medium">{r.designation}</TD>
                      <TD align="right">{r.vacancies}</TD>
                      <TD align="right">{r.filled}</TD>
                      <TD align="right">{r.applications}</TD>
                      <TD align="right">
                        <Badge tone={fill >= 0.8 ? "success" : fill >= 0.4 ? "warning" : "danger"} size="sm">
                          {formatPercent(fill)}
                        </Badge>
                      </TD>
                      <TD>
                        <StatusBadge value={r.status} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time to hire</CardTitle>
            <CardDescription>Fastest hires from application to joining date.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={8} cols={4} />
            ) : (
              <TableWrap className="max-h-[400px] overflow-y-auto">
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Candidate</TH>
                    <TH>Requisition</TH>
                    <TH>Applied</TH>
                    <TH align="right">Days</TH>
                  </TR>
                </THead>
                <TBody>
                  {(data?.timeToHire ?? []).map((t, i) => (
                    <TR key={`${t.name}-${i}`}>
                      <TD className="font-medium">{t.name}</TD>
                      <TD>
                        <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{t.job}</code>
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(t.appliedAt)}</TD>
                      <TD align="right">
                        <StatusBadge value={t.days <= 20 ? "Fast" : t.days <= 45 ? "Typical" : "Slow"} /> {t.days}
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
            <CardTitle>Rejection reasons</CardTitle>
            <CardDescription>Patterns behind declined applications.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} cols={2} />
            ) : (data?.rejectionReasons ?? []).length ? (
              <>
                <GenericDonut data={data?.rejectionReasons ?? []} height={210} formatValue={(v) => String(v)} />
                <div className="mt-3">
                  <HorizontalBars data={data?.rejectionReasons ?? []} valueFormat={(v) => `${v} rejected`} />
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-[13px] text-muted">No rejections recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost per hire</CardTitle>
          <CardDescription>
            Recruitment spend against completed hires, using approved expenses raised through the recruitment categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Offers issued" value={formatNumber((data?.sources ?? []).reduce((s, r) => s + r.offers, 0))} sub="All sources combined" tone="info" />
          <KpiCard label="Joined" value={formatNumber(totals.joined)} sub="Converted to employees" tone="success" />
          <KpiCard label="Requisition fill rate" value={formatPercent(totals.fillRate)} sub="Vacancies filled" tone="brand" />
          <KpiCard label="Average days to hire" value={`${totals.avgTimeToHire} days`} sub="Application to joining" tone="warning" />
        </CardContent>
      </Card>
    </div>
  );
}
