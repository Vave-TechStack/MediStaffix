"use client";

import * as React from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--text)] ring-focus transition-colors placeholder:text-[var(--text-muted)]/70 disabled:opacity-60 disabled:cursor-not-allowed";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(fieldBase, "h-10", invalid ? "border-red-400" : "border-[var(--border-strong)]", className)}
      style={invalid ? { borderColor: "#f87171" } : undefined}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-[92px] py-2.5 leading-relaxed", invalid ? "border-red-400" : "border-[var(--border-strong)]", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-[12.5px] font-medium text-[var(--text)]", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: { value: string; label: string; hint?: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, invalid, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          fieldBase,
          "h-10 appearance-none pr-9",
          invalid ? "border-red-400" : "border-[var(--border-strong)]",
          className
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
    </div>
  )
);
Select.displayName = "Select";

/** Multi-select rendered as toggleable chips — easier to use than a native listbox. */
export function MultiSelect({
  options,
  value,
  onChange,
  invalid,
  placeholder = "Select one or more",
  max,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  placeholder?: string;
  max?: number;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };
  return (
    <div
      className={cn(
        "rounded-lg border p-2",
        invalid ? "border-red-400" : "border-[var(--border-strong)]",
        value.length === 0 ? "" : "bg-[var(--surface-2)]"
      )}
    >
      {options.length === 0 ? (
        <p className="px-1 py-1.5 text-[13px] text-muted">{placeholder}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const active = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors ring-focus",
                  active
                    ? "border-mint-500 bg-mint-50 text-mint-800 dark:bg-mint-950 dark:text-mint-200"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-sea-400 hover:text-[var(--text)]"
                )}
              >
                {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      {max && value.length >= max ? (
        <p className="mt-1.5 px-1 text-[11.5px] text-muted">Maximum {max} selection(s).</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
}) {
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors ring-focus",
        checked ? "bg-mint-500" : "bg-[var(--border-strong)]",
        disabled && "opacity-50"
      )}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
        style={{ height: 16, width: 16 }}
      />
    </button>
  );
  if (!label) return control;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[13px] font-medium text-[var(--text)]">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-muted">{hint}</p> : null}
      </div>
      {control}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function FormRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormField({
  label,
  required,
  error,
  help,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  span?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(span === 2 && "sm:col-span-2", span === 3 && "sm:col-span-2 lg:col-span-3", span === 4 && "sm:col-span-2 lg:col-span-4")}>
      <Label required={required}>{label}</Label>
      {children}
      {help && !error ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{help}</p> : null}
      <FieldError message={error} />
    </div>
  );
}
