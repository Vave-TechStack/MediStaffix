"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 ring-focus disabled:pointer-events-none disabled:opacity-55 active:translate-y-px select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-800 text-white shadow-sm hover:bg-brand-700 hover:shadow-md dark:bg-mint-600 dark:text-brand-950 dark:hover:bg-mint-500",
        secondary:
          "bg-sea-600 text-white shadow-sm hover:bg-sea-700",
        accent:
          "bg-mint-500 text-brand-950 shadow-sm hover:bg-mint-400",
        outline:
          "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] hover:border-sea-400",
        ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        subtle: "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        link: "text-sea-700 underline-offset-4 hover:underline dark:text-mint-400",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9.5 px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9.5 w-9.5",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const spinner = loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null;
    // Slot projects onto exactly one element child, so the trigger must be the
    // only thing it receives; extra siblings (the spinner, fragments, multiple
    // nodes) make Radix throw at render time.
    const body =
      asChild && React.Children.count(children) === 1 ? children : <span className="contents">{spinner}{children}</span>;
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? body : <>{spinner}{children}</>}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
