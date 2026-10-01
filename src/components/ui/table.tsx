import * as React from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b" style={{ background: "var(--surface-2)" }}>
        {children}
      </tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  onClick,
  sorted,
  align = "left",
  title,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  sorted?: "asc" | "desc" | false;
  align?: "left" | "right" | "center";
  title?: string;
}) {
  return (
    <th
      scope="col"
      title={title}
      className={cn(
        "border-b px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        onClick && "cursor-pointer select-none hover:text-[var(--text)]",
        className
      )}
      onClick={onClick}
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {children}
        {sorted ? <span className="text-mint-600">{sorted === "asc" ? "▲" : "▼"}</span> : null}
      </span>
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b transition-colors last:border-0",
        onClick && "cursor-pointer hover:bg-[var(--surface-2)]",
        selected && "bg-mint-50/60 dark:bg-mint-950/30",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-3 py-2.5 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TFoot({ children }: { children: React.ReactNode }) {
  return (
    <tfoot>
      <tr className="border-t-2" style={{ background: "var(--surface-2)" }}>
        {children}
      </tr>
    </tfoot>
  );
}
