"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

const AXIS = { stroke: "var(--text-muted)", fontSize: 11 };
const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 32px -12px rgba(18,48,71,0.25)",
};
const PALETTE = ["#176B87", "#20B89A", "#123047", "#4D87AE", "#D97706", "#8B5CF6", "#DC2626", "#0891B2"];

function monthLabel(period: string) {
  const [y, m] = period.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function RevenuePayrollChart({
  data,
  showExpenses = true,
}: {
  data: { label: string; invoiced: number; collected: number; payroll: number; expenses?: number }[];
  showExpenses?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="msxRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20B89A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#20B89A" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickFormatter={monthLabel} {...AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => formatMoney(v, { compact: true })} {...AXIS} tickLine={false} axisLine={false} width={58} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [formatMoney(value), name]}
          labelFormatter={(l) => monthLabel(String(l))}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
        <Bar dataKey="invoiced" name="Revenue invoiced" fill="url(#msxRev)" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Bar dataKey="collected" name="Revenue collected" fill="#4D87AE" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="payroll" name="Payroll cost" stroke="#D97706" strokeWidth={2.4} dot={false} />
        {showExpenses ? (
          <Line type="monotone" dataKey="expenses" name="Operating expenses" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MarginTrendChart({ data }: { data: { label: string; grossMargin: number; operatingSurplus: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickFormatter={monthLabel} {...AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => formatMoney(v, { compact: true })} {...AXIS} tickLine={false} axisLine={false} width={58} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [formatMoney(v), n]} labelFormatter={(l) => monthLabel(String(l))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
        <Bar dataKey="grossMargin" name="Gross margin" fill="#20B89A" radius={[5, 5, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="operatingSurplus" name="Operating surplus" stroke="#123047" strokeWidth={2.4} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DeploymentTrendChart({ data }: { data: { label: string; active: number; added: number; ended: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="msxDep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#176B87" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#176B87" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickFormatter={monthLabel} {...AXIS} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} {...AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(l) => monthLabel(String(l))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
        <Area type="monotone" dataKey="active" name="Active deployments" stroke="#176B87" strokeWidth={2.2} fill="url(#msxDep)" />
        <Line type="monotone" dataKey="added" name="Added" stroke="#20B89A" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="ended" name="Ended" stroke="#DC2626" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HospitalRevenueChart({ data }: { data: { short: string; name: string; invoiced: number; collected: number; outstanding: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }} barCategoryGap={8}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => formatMoney(v, { compact: true })} {...AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="short" width={92} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "var(--surface-2)" }}
          formatter={(v: number, n: string) => [formatMoney(v), n]}
          labelFormatter={(_, payload) => (payload?.[0]?.payload as { name: string })?.name ?? ""}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11.5, paddingTop: 6 }} />
        <Bar dataKey="invoiced" name="Invoiced" fill="#176B87" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="collected" name="Collected" fill="#20B89A" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="outstanding" name="Outstanding" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        const conversion = i === 0 ? 100 : Math.round((d.count / Math.max(1, data[0].count)) * 1000) / 10;
        return (
          <div key={d.stage}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-medium">{d.stage}</span>
              <span className="text-[12px] text-muted">
                <span className="font-semibold text-[var(--text)] tabular-nums">{formatNumber(d.count)}</span> · {conversion}% of applied
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 2)}%`, background: PALETTE[i % PALETTE.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${formatNumber(v)} (${formatPercent(total ? (v / total) * 100 : 0, 0)})`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-semibold leading-none tabular-nums">{formatNumber(total)}</span>
          <span className="mt-0.5 text-[11px] text-muted">Doctors</span>
        </div>
      </div>
      <ul className="min-w-[150px] flex-1 space-y-1.5">
        {data.slice(0, 7).map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="font-medium tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AgingChart({ data }: { data: { bucket: string; amount: number; count: number }[] }) {
  const colors: Record<string, string> = {
    "Not due": "#10B981",
    "1-30 days": "#F59E0B",
    "31-60 days": "#F97316",
    "61-90 days": "#EF4444",
    "90+ days": "#B91C1C",
  };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="bucket" {...AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => formatMoney(v, { compact: true })} {...AXIS} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number, _n: string, item) => [formatMoney(v), `${item?.payload?.count ?? 0} invoice(s)`]}
        />
        <Bar dataKey="amount" name="Outstanding" radius={[5, 5, 0, 0]} maxBarSize={46}>
          {data.map((d) => (
            <Cell key={d.bucket} fill={colors[d.bucket] ?? "#176B87"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
  valueFormat = (v: number) => formatMoney(v, { compact: true }),
}: {
  data: { name: string; value: number; hint?: string }[];
  valueFormat?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => (
        <li key={d.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate font-medium">{d.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              <span className="font-semibold text-[var(--text)]">{valueFormat(d.value)}</span>
              {d.hint ? <span className="ml-1.5">{d.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max((d.value / max) * 100, 1.5)}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Generic grouped/stacked bar chart driven by an aggregate payload, so report
 * pages can plot any series without adding a bespoke component each time.
 */
export function GenericBars({
  data,
  xKey,
  series,
  height = 260,
  stacked = false,
  formatValue = (v: number) => formatNumber(v),
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  stacked?: boolean;
  formatValue?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => monthLabel(String(v))} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatValue(Number(v))} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number, n: string) => [formatValue(Number(v)), n]}
          labelFormatter={(l) => monthLabel(String(l))}
        />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconType="circle" iconSize={8} /> : null}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId={stacked ? "a" : undefined} fill={s.color ?? PALETTE[i % PALETTE.length]} radius={stacked ? 0 : [4, 4, 0, 0]} maxBarSize={38} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Generic donut with an optional centre caption, used for composition breakdowns. */
export function GenericDonut({
  data,
  height = 240,
  formatValue = (v: number) => formatMoney(v, { compact: true }),
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [formatValue(Number(v)), n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
          <p className="text-[11.5px] text-muted">{centerLabel}</p>
          <p className="text-[19px] font-semibold tabular-nums">{centerValue}</p>
        </div>
      ) : null}
      {!data.length ? <p className="py-16 text-center text-[13px] text-muted">No data for this period.</p> : null}
      {data.length ? <span className="sr-only">Total {formatValue(total)}</span> : null}
    </div>
  );
}

export function Sparkline({ data, color = "#20B89A", height = 34 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${height - ((v - min) / span) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }} className="w-full" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
