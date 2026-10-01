"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeIndianRupee,
  Banknote,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  FileWarning,
  HandCoins,
  HeartPulse,
  RefreshCw,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAggregate } from "@/lib/client";
import { cn, formatDate, formatMoney, formatNumber, formatTime, relativeTime, daysUntil } from "@/lib/utils";
import { Avatar, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, KpiCard, PageHeader, Skeleton, StatusBadge, Button, Notice, Badge } from "@/components/ui";
import { AgingChart, CategoryDonut, DeploymentTrendChart, FunnelChart, HospitalRevenueChart, RevenuePayrollChart, Sparkline } from "@/components/charts";

interface Kpi {
  key: string;
  label: string;
  value: string | number;
  sub?: string;
  money?: boolean;
  tone: "brand" | "info" | "success" | "warning" | "danger";
}

/** Widget payloads mirror the `widgets` object built by the dashboard aggregate. */
interface DashboardWidgets {
  pendingApprovals: { type: string; id: string; label: string; link: string }[];
  recentHospitalActivity: {
    id: string;
    type: string;
    summary: string;
    at: string;
    actor: string;
    hospital?: string;
  }[];
  upcomingInterviews: {
    id: string;
    candidate: string;
    job: string;
    round: number;
    mode: string;
    scheduledAt: string;
  }[];
  joiningThisWeek: { id: string; name: string; designation: string; dateOfJoining: string }[];
  upcomingShifts: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    employee: string;
    hospital: string;
  }[];
  contractExpirations: { id: string; number: string; hospital: string; endDate: string; daysLeft: number; status: string }[];
  overduePayments: { id: string; invoiceNo: string; hospital: string; outstanding: number; daysOverdue: number }[];
  payrollStatus: { id: string; period: string; status: string; totalNet: number; totalEmployees: number; locked: boolean }[];
  notifications: {
    id: string;
    title: string;
    body: string;
    type: string;
    severity: string;
    link?: string;
    createdAt: string;
    unread: boolean;
  }[];
  unassignedShifts: number;
  /** Present only on the doctor portal dashboard. */
  profile?: {
    name: string;
    employeeCode: string;
    designation: string;
    department: string;
    dateOfJoining: string;
    employmentType: string;
    specialisation?: string;
    council?: string;
  } | null;
  deployment?: {
    deploymentCode: string;
    hospital?: string;
    designation: string;
    shift: string;
    startDate: string;
    endDate: string;
    reportingContact: string;
    reportingContactPhone: string;
  } | null;
  deploymentHistory?: { id: string; code: string; hospital?: string; designation: string; startDate: string; endDate: string; status: string }[];
  upcomingShiftsPortal?: (DashboardWidgets["upcomingShifts"] & { hospital?: string })[];
  recentAttendance?: { id: string; date: string; status: string; workedHours: number; overtimeHours: number; hospital?: string }[];
  leaveRequests?: { id: string; type: string; fromDate: string; toDate: string; days: number; status: string }[];
  payslips?: { id: string; period: string; netSalary: number; generatedAt: string }[];
  lastPayslipBreakdown?: Record<string, number | string> | null;
  documents?: { id: string; name: string; category: string; uploadedAt: string }[];
}

interface DashboardPayload {
  kpis: Kpi[];
  charts: {
    revenueVsPayroll: { label: string; invoiced: number; collected: number; payroll: number; expenses: number }[];
    deploymentTrend: { label: string; active: number; added: number; ended: number }[];
    hospitalRevenue: { short: string; name: string; invoiced: number; collected: number; outstanding: number }[];
    funnel: { stage: string; count: number }[];
    categoryDist: { name: string; value: number }[];
    aging: { bucket: string; amount: number; count: number }[];
  };
  widgets: DashboardWidgets;
  meta: { period: string; generatedAt: string; isPortal: boolean; role: string };
}

const KPI_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hospitals: Building2,
  activeClients: BedDouble,
  doctors: Stethoscope,
  deployed: HeartPulse,
  openReqs: ClipboardCheck,
  revenue: TrendingUp,
  payroll: Wallet,
  outstanding: Banknote,
  margin: BadgeIndianRupee,
  expiring: CalendarClock,
  present: CalendarCheck,
  shifts: CalendarClock,
  deployment: Building2,
  net: Wallet,
  ot: Activity,
  leave: CalendarCheck,
};

function Widget({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

export function ExecutiveDashboard() {
  const { data, loading, error, refetch } = useAggregate<DashboardPayload>("dashboard");

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Executive dashboard" description="Loading live figures from the demonstration dataset…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-[14px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }
  if (error || !data) return <ErrorState message={error ?? "Dashboard data is unavailable."} onRetry={refetch} />;

  const { kpis, charts, widgets, meta } = data;
  const pendingApprovals = widgets.pendingApprovals;

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.role === "Hospital Client" ? "Your staffing overview" : "Executive dashboard"}
        description={
          meta.role === "Hospital Client"
            ? "Staffing strength, roster, invoices and service requests for your organisation, scoped to your account."
            : `Live operational and financial position for ${meta.period}. Every figure is computed from current records.`
        }
        actions={
          <>
            <span className="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] text-muted sm:inline-flex" style={{ borderColor: "var(--border)" }}>
              <Activity className="h-3.5 w-3.5 text-mint-600" /> Updated {relativeTime(meta.generatedAt)}
            </span>
            <Button variant="outline" size="sm" onClick={refetch} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </>
        }
      />

      <Notice tone="info" title="Demonstration environment">
        All records below are fictional and generated for this evaluation. Payment receipts and payroll disbursements are
        simulated — no bank, SMS or email provider is contacted.
      </Notice>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const Icon = KPI_ICONS[k.key] ?? Activity;
          const trend = k.key === "revenue" || k.key === "payroll" || k.key === "outstanding" || k.key === "deployed" ? charts.revenueVsPayroll.map((m) => (k.key === "outstanding" ? m.invoiced - m.collected : k.key === "deployed" ? m.invoiced : k.key === "payroll" ? m.payroll : m.invoiced)) : undefined;
          return (
            <KpiCard
              key={k.key}
              label={k.label}
              tone={k.tone}
              icon={Icon}
              value={k.money ? formatMoney(k.value, { compact: Number(k.value) >= 100000 }) : typeof k.value === "number" ? formatNumber(k.value) : k.value}
              sub={k.sub}
              spark={trend ? <Sparkline data={trend} color={k.tone === "danger" ? "#DC2626" : k.tone === "warning" ? "#D97706" : "#20B89A"} /> : undefined}
            />
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Monthly revenue versus payroll</CardTitle>
              <CardDescription>
                Invoiced and collected revenue against payroll cost and approved operating expenses over the last 12 months.
              </CardDescription>
            </div>
            <Badge tone="brand">Rolling 12 months</Badge>
          </CardHeader>
          <CardContent>
            <RevenuePayrollChart data={charts.revenueVsPayroll} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Doctor category distribution</CardTitle>
              <CardDescription>Active clinical workforce by primary staffing category.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {charts.categoryDist.length ? <CategoryDonut data={charts.categoryDist} /> : <EmptyState title="No doctor records" compact />}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Doctor deployment trend</CardTitle>
              <CardDescription>Active deployment headcount, additions and completions per month.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DeploymentTrendChart data={charts.deploymentTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Outstanding invoice ageing</CardTitle>
              <CardDescription>Unsettled balances grouped by days past the due date.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AgingChart data={charts.aging} />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Hospital-wise revenue</CardTitle>
              <CardDescription>
                Invoiced, collected and outstanding for {meta.period}, highest billing hospital first.
              </CardDescription>
            </div>
            <Link href="/analytics/revenue" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 ring-focus dark:text-mint-400">
              Full report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {charts.hospitalRevenue.length ? <HospitalRevenueChart data={charts.hospitalRevenue} /> : <EmptyState title="No invoices for this period" compact />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recruitment funnel</CardTitle>
              <CardDescription>Applications reaching each pipeline stage.</CardDescription>
            </div>
            <Link href="/recruitment/applications" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 ring-focus dark:text-mint-400">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <FunnelChart data={charts.funnel} />
          </CardContent>
        </Card>
      </div>

      {/* Widgets */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Widget
          title="Pending approvals"
          description="Items waiting on a decision from your role."
          action={<Badge tone={pendingApprovals.length ? "warning" : "success"}>{pendingApprovals.length}</Badge>}
        >
          {pendingApprovals.length === 0 ? (
            <EmptyState title="Nothing pending" description="All approval queues are clear." compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {pendingApprovals.map((p) => (
                <li key={`${p.type}-${p.id}`}>
                  <Link href={p.link} className="flex items-center gap-3 py-2.5 ring-focus transition-colors hover:bg-[var(--surface-2)]">
                    <Badge tone="warning" size="sm">
                      {p.type}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{p.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          title="Overdue payments"
          description="Oldest unsettled balances first."
          action={
            <Link href="/erp/invoices" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Invoices <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {widgets.overduePayments.length === 0 ? (
            <EmptyState title="No overdue invoices" compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {widgets.overduePayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.hospital}</p>
                    <p className="text-[11.5px] text-muted">
                      {p.invoiceNo} · {p.daysOverdue} day(s) overdue
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {formatMoney(p.outstanding, { compact: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          title="Contract expiration alerts"
          description="Contracts within 120 days of expiry."
          action={
            <Link href="/crm/contracts" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Contracts <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {widgets.contractExpirations.length === 0 ? (
            <EmptyState title="No contracts expiring soon" compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {widgets.contractExpirations.map((c) => {
                const d = daysUntil(c.endDate);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <AlertTriangle className={cn("h-4 w-4 shrink-0", d <= 30 ? "text-red-500" : d <= 60 ? "text-amber-500" : "text-muted")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{c.hospital}</p>
                      <p className="text-[11.5px] text-muted">
                        {c.number} · ends {formatDate(c.endDate)}
                      </p>
                    </div>
                    <Badge tone={d <= 30 ? "danger" : d <= 60 ? "warning" : "neutral"} size="sm">
                      {d < 0 ? "Expired" : `${d}d`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Widget>

        <Widget
          title="Upcoming interviews"
          description="Scheduled and awaiting a panel outcome."
          action={
            <Link href="/recruitment/interviews" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {widgets.upcomingInterviews.length === 0 ? (
            <EmptyState title="No interviews scheduled" compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {widgets.upcomingInterviews.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{i.candidate}</p>
                    <p className="text-[11.5px] text-muted">
                      {i.job} · round {i.round} · {i.mode}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-muted">{formatDate(i.scheduledAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          title="Upcoming shift assignments"
          description="Next scheduled duties across deployments."
          action={
            <Link href="/workforce/shifts" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Roster <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {widgets.upcomingShifts.length === 0 ? (
            <EmptyState title="No upcoming shifts" compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {widgets.upcomingShifts.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Badge tone={s.type === "Night" ? "info" : s.type === "Day" ? "accent" : "neutral"} size="sm">
                    {s.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{s.employee}</p>
                    <p className="truncate text-[11.5px] text-muted">{s.hospital}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
                    {formatDate(s.date)} · {formatTime(s.startTime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          title="Payroll processing status"
          description="Recent monthly runs and their approval state."
          action={
            <Link href="/payroll/salary-processing" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Payroll <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {widgets.payrollStatus.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{p.period}</p>
                  <p className="text-[11.5px] text-muted">
                    {p.totalEmployees} employees · {formatMoney(p.totalNet, { compact: true })} net
                  </p>
                </div>
                <StatusBadge value={p.status} />
                {p.locked ? <HandCoins className="h-3.5 w-3.5 shrink-0 text-muted" /> : null}
              </li>
            ))}
          </ul>
        </Widget>

        <Widget
          title="Doctors joining this week"
          description="New joiners inside the next seven days."
          action={
            <Link href="/workforce/employees" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-sea-700 dark:text-mint-400">
              Employees <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {widgets.joiningThisWeek.length === 0 ? (
            <EmptyState title="No joiners this week" compact />
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {widgets.joiningThisWeek.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={e.name} size={28} color="#176B87" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{e.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{e.designation}</p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-muted">{formatDate(e.dateOfJoining)}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Recent hospital activity" description="Latest events recorded across client accounts.">
          {widgets.recentHospitalActivity.length === 0 ? (
            <EmptyState title="No recent activity" compact />
          ) : (
            <ul className="space-y-3">
              {widgets.recentHospitalActivity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mint-500" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">{a.summary}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {a.actor} · {a.hospital ?? "Platform"} · {relativeTime(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Recent notifications" description="Approvals, escalations and workflow updates.">
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {widgets.notifications.map((n) => (
              <li key={n.id} className="py-2.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.severity === "Critical" ? "bg-red-500" : n.severity === "Warning" ? "bg-amber-500" : n.severity === "Success" ? "bg-emerald-500" : "bg-sky-500"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{n.title}</p>
                    <p className="text-[11.5px] leading-snug text-muted">{n.body}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">{relativeTime(n.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Widget>
      </div>
    </div>
  );
}

export { FileWarning, UserPlus, Users };
