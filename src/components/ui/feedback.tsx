import * as React from "react";
import { AlertTriangle, Info, Inbox, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Card } from "./card";

/* ------------------------------ states ----------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-6 py-8" : "px-6 py-14")}>
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "var(--surface-2)" }}
      >
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={message}
      action={
        onRetry ? (
          <button onClick={onRetry} className="rounded-lg border px-3.5 py-2 text-[13px] font-medium ring-focus hover:bg-[var(--surface-2)]">
            Try again
          </button>
        ) : undefined
      }
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-muted", className)} aria-label="Loading" />;
}

/* ---------------------------- indicators --------------------------- */

export function Delta({ value, className }: { value: number; className?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold",
        positive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
        className
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export function Progress({ value, tone = "brand", className }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; className?: string }) {
  const colors = {
    brand: "bg-sea-600",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", className)} style={{ background: "var(--surface-2)" }}>
      <div className={cn("h-full rounded-full transition-all duration-500", colors[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        background: color ?? "var(--color-sea-600)",
        fontSize: Math.max(10, size * 0.36),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  icon: Icon,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const styles = {
    info: { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.25)", text: "#0369a1", Fallback: Info },
    warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.28)", text: "#b45309", Fallback: AlertTriangle },
    danger: { bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.25)", text: "#b91c1c", Fallback: AlertTriangle },
    success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.28)", text: "#047857", Fallback: Info },
  }[tone];
  const I = Icon ?? styles.Fallback;
  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed", className)} style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}>
      <I className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- KPI card ---------------------------- */

export function KpiCard({
  label,
  value,
  sub,
  tone = "brand",
  icon: Icon,
  href,
  spark,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "brand" | "info" | "success" | "warning" | "danger";
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  spark?: React.ReactNode;
}) {
  const tones = {
    brand: { chip: "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200", bar: "bg-brand-700 dark:bg-mint-500" },
    info: { chip: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300", bar: "bg-sky-500" },
    success: { chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", bar: "bg-emerald-500" },
    warning: { chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", bar: "bg-amber-500" },
    danger: { chip: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300", bar: "bg-red-500" },
  }[tone];

  const body = (
    <Card className="group relative overflow-hidden p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones.chip)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      {sub ? <p className="mt-1.5 text-[12px] leading-snug text-muted">{sub}</p> : null}
      {spark ? <div className="mt-3">{spark}</div> : null}
      <span className={cn("absolute inset-y-0 left-0 w-1 opacity-70", tones.bar)} />
    </Card>
  );
  return href ? <a href={href} className="block ring-focus rounded-[14px]">{body}</a> : body;
}

export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {breadcrumbs}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5", className)} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {children}
    </div>
  );
}
