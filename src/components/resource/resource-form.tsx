"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paperclip, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { formatNumber } from "@/lib/utils";
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FormField, Input, Label, MultiSelect, Select, Switch, Textarea } from "@/components/ui";
import type { ResolvedField } from "@/lib/resource-types";

export interface ResourceMeta {
  key: string;
  label: string;
  labelPlural: string;
  description: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  titleField?: string;
  searchPlaceholder?: string;
  fields: ResolvedField[];
  immutableFields: string[];
}

function buildSchema(fields: ResolvedField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    if (f.readOnly) continue;
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "number":
      case "money": {
        let n = z.coerce.number({ invalid_type_error: `${f.label} must be a number` });
        if (f.min !== undefined) n = n.min(f.min, `${f.label} must be at least ${f.min}`);
        if (f.max !== undefined) n = n.max(f.max, `${f.label} must be at most ${f.max}`);
        s = n;
        break;
      }
      case "multiselect":
        s = z.array(z.string());
        break;
      case "switch":
        s = z.boolean();
        break;
      case "date":
        s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${f.label} must be a valid date`);
        break;
      case "datetime":
        s = z.string().min(1, `${f.label} is required`);
        break;
      case "email":
        s = z.string().email(`${f.label} must be a valid email address`);
        break;
      case "static":
        s = z.any();
        break;
      default: {
        s = z.string();
        if (f.resolvedOptions?.length) {
          s = s.refine((v) => f.resolvedOptions!.some((o) => o.value === v), {
            message: `${f.label} must be one of the listed options.`,
          });
        }
      }
    }
    if (f.required) {
      s =
        f.type === "multiselect"
          ? s.refine((v) => Array.isArray(v) && v.length > 0, { message: `${f.label} must have at least one selection` })
          : s.refine((v) => String(v ?? "").trim().length > 0, { message: `${f.label} is required` });
    }
    shape[f.name] = s.optional();
  }
  return z.object(shape);
}

const isBlank = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

export function ResourceFormDialog({
  open,
  onOpenChange,
  meta,
  row,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: ResourceMeta;
  row?: Record<string, unknown> | null;
  onSaved: () => void;
}) {
  const schema = useMemo(() => buildSchema(meta.fields), [meta.fields]);
  const editing = Boolean(row?.id);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ name: string; size: number; type: string } | null>(null);

  const initial = useMemo(() => {
    const base: Record<string, unknown> = {};
    for (const f of meta.fields) {
      if (f.readOnly) continue;
      if (row && f.name in row) {
        base[f.name] = row[f.name];
      } else {
        base[f.name] =
          f.defaultValue !== undefined
            ? f.defaultValue
            : f.type === "multiselect"
              ? []
              : f.type === "switch"
                ? false
                : f.type === "number" || f.type === "money"
                  ? 0
                  : f.type === "date"
                    ? new Date().toISOString().slice(0, 10)
                    : "";
      }
    }
    return base;
  }, [meta, row]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema as never),
    defaultValues: initial,
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) {
      form.reset(initial);
      setServerErrors({});
      setRootError(null);
      setReceipt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setServerErrors({});
    setRootError(null);
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const f of meta.fields) {
        if (f.type === "select" && isBlank(payload[f.name])) payload[f.name] = "";
        if (!f.required && isBlank(payload[f.name]) && f.type !== "multiselect") payload[f.name] = f.type === "number" || f.type === "money" ? 0 : "";
      }
      if (receipt) {
        payload.__receiptName = receipt.name;
        payload.__receiptSize = receipt.size;
        payload.__receiptType = receipt.type;
      }
      if (editing) {
        await api.patch(`/api/${meta.key}/${row!.id}`, payload);
        toast.success(`${meta.label} updated.`);
      } else {
        await api.post(`/api/${meta.key}`, payload);
        toast.success(`${meta.label} created.`);
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setServerErrors(error.fieldErrors ?? {});
        setRootError(error.fieldErrors?._root ?? error.message);
        if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) setRootError(error.message);
      } else {
        setRootError(error instanceof Error ? error.message : "The record could not be saved.");
      }
    } finally {
      setBusy(false);
    }
  });

  const err = (name: string) => (form.formState.errors[name]?.message as string) ?? serverErrors[name];
  const supportsFile = ["documents", "expenses", "payments"].includes(meta.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={meta.fields.length > 12 ? "lg" : "md"}>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${meta.label.toLowerCase()}` : `New ${meta.label.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Record ${String(row!.id)} · changes are validated on the server and written to the audit log.`
                : "Fields marked with * are required. Validation runs in the browser and again on the server."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {rootError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {rootError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
              {meta.fields
                .filter((f) => !f.readOnly)
                .map((f) => {
                  const value = form.watch(f.name);
                  const common = {
                    label: f.label,
                    required: f.required,
                    error: err(f.name),
                    help: f.help,
                    span: f.span,
                  };
                  if (f.type === "multiselect") {
                    return (
                      <FormField key={f.name} {...common}>
                        <MultiSelect
                          options={f.resolvedOptions ?? []}
                          value={Array.isArray(value) ? (value as string[]) : []}
                          onChange={(next) => form.setValue(f.name, next, { shouldValidate: true })}
                          invalid={Boolean(err(f.name))}
                        />
                      </FormField>
                    );
                  }
                  if (f.type === "switch") {
                    return (
                      <FormField key={f.name} {...common} span={f.span ?? 2}>
                        <div className="rounded-lg border px-3.5 py-3" style={{ borderColor: "var(--border-strong)" }}>
                          <Switch
                            checked={Boolean(value)}
                            onCheckedChange={(v) => form.setValue(f.name, v, { shouldValidate: true })}
                            label={f.label}
                            hint={f.help}
                          />
                        </div>
                      </FormField>
                    );
                  }
                  if (f.type === "select") {
                    return (
                      <FormField key={f.name} {...common}>
                        <Select
                          options={f.resolvedOptions ?? []}
                          value={String(value ?? "")}
                          onChange={(e) => form.setValue(f.name, e.target.value, { shouldValidate: true })}
                          invalid={Boolean(err(f.name))}
                          placeholder="Select…"
                        />
                      </FormField>
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <FormField key={f.name} {...common}>
                        <Textarea
                          value={String(value ?? "")}
                          onChange={(e) => form.setValue(f.name, e.target.value, { shouldValidate: true })}
                          placeholder={f.placeholder}
                          invalid={Boolean(err(f.name))}
                        />
                      </FormField>
                    );
                  }
                  if (f.type === "datetime") {
                    return (
                      <FormField key={f.name} {...common}>
                        <Input
                          type="datetime-local"
                          value={String(value ?? "").slice(0, 16)}
                          onChange={(e) => form.setValue(f.name, e.target.value, { shouldValidate: true })}
                          invalid={Boolean(err(f.name))}
                        />
                      </FormField>
                    );
                  }
                  return (
                    <FormField key={f.name} {...common}>
                      <div className="relative">
                        <Input
                          type={f.type === "number" || f.type === "money" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                          value={String(value ?? "")}
                          min={f.min}
                          max={f.max}
                          step={f.step ?? (f.type === "money" ? 1 : undefined)}
                          placeholder={f.placeholder}
                          onChange={(e) => form.setValue(f.name, f.type === "number" || f.type === "money" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value, { shouldValidate: true })}
                          invalid={Boolean(err(f.name))}
                          className={f.type === "money" ? "pr-9" : undefined}
                        />
                        {f.type === "money" ? (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">₹</span>
                        ) : null}
                      </div>
                    </FormField>
                  );
                })}
            </div>

            {supportsFile ? (
              <div className="mt-4 rounded-lg border border-dashed p-4" style={{ borderColor: "var(--border-strong)" }}>
                <Label>Attach supporting file</Label>
                {receipt ? (
                  <div className="flex items-center gap-2.5 rounded-md bg-[var(--surface-2)] px-3 py-2">
                    <Paperclip className="h-4 w-4 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{receipt.name}</span>
                    <span className="text-[11.5px] text-muted">{formatNumber(Math.max(1, Math.round(receipt.size / 1024)))} KB</span>
                    <button type="button" onClick={() => setReceipt(null)} className="rounded p-1 text-muted hover:text-[var(--text)]" aria-label="Remove attachment">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id={`file-${meta.key}`}
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setReceipt({ name: file.name, size: file.size, type: file.type || "application/octet-stream" });
                      }}
                    />
                    <label
                      htmlFor={`file-${meta.key}`}
                      className="mt-1 flex cursor-pointer items-center gap-2 text-[13px] text-sea-700 ring-focus dark:text-mint-400"
                    >
                      <Paperclip className="h-4 w-4" /> Choose a file
                    </label>
                    <p className="mt-1.5 text-[11.5px] text-muted">
                      In this demonstration the file record and metadata are stored, but no binary content is persisted.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={form.formState.isSubmitting}>
              <Save className="h-4 w-4" /> {editing ? "Save changes" : `Create ${meta.label.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
