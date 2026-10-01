import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, statusTone } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
        brand: "bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-800",
        info: "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
        warning: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
        danger: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
        accent: "bg-mint-50 text-mint-700 border-mint-100 dark:bg-mint-950/50 dark:text-mint-300 dark:border-mint-900",
      },
      size: {
        sm: "px-2 py-0 text-[10.5px]",
        md: "",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Status badge that derives its colour from the record's own state value. */
export function StatusBadge({ value, className, dot = true }: { value: string; className?: string; dot?: boolean }) {
  return (
    <Badge tone={statusTone(value)} dot={dot} className={className}>
      {value}
    </Badge>
  );
}

export { badgeVariants };
