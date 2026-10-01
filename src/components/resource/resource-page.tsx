"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiError, emptyQuery, useResourceList, type QueryState } from "@/lib/client";
import { cn, downloadCsv, exportPdf, formatDate, formatDateTime, formatMoney, toCsv } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  Toolbar,
  TR,
} from "@/components/ui";
import { ResourceFormDialog, type ResourceMeta } from "./resource-form";
import { useWorkflow } from "./workflow-actions";
import type { ColumnDef, ResolvedField } from "@/lib/resource-types";

export type Row = Record<string, unknown> & { id: string; __cells?: Record<string, string | number> };

export interface PageContext {
  refetch: () => void;
  openCreate: () => void;
  openEdit: (row: Row) => void;
  query: QueryState;
  setQuery: React.Dispatch<React.SetStateAction<QueryState>>;
  meta: ResourceMeta | null;
}

export interface ResourcePageProps {
  resource: string;
  title: string;
  description?: string;
  headerActions?: (ctx: PageContext) => React.ReactNode;
  rowActions?: (row: Row, ctx: PageContext) => React.ReactNode;
  toolbarExtra?: (ctx: PageContext) => React.ReactNode;
  defaultFilters?: Record<string, string>;
  defaultSort?: string;
  hideFilters?: string[];
  stats?: (ctx: PageContext) => React.ReactNode;
  notice?: React.ReactNode;
  /** Render a custom table body instead of the default. */
  customTable?: boolean;
  detail?: (row: Row, ctx: PageContext) => React.ReactNode;
  exportName?: string;
  /** Show only these column keys, in this order. Defaults to every column. */
  columnKeys?: string[];
}

function useMeta(key: string) {
  const [meta, setMeta] = useState<ResourceMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<ResourceMeta & { columns: ColumnDef[]; filters: { field: string; label: string; options?: { value: string; label: string }[] }[] }>(`/api/resources/${key}`)
      .then((res) => {
        if (cancelled) return;
        setMeta(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { meta, loading, error, retry: () => setNonce((n) => n + 1) };
}

function displayValue(col: ColumnDef, row: Row) {
  if (col.value) return col.value(row, {} as never);
  const cell = row.__cells?.[col.key];
  if (cell !== undefined) return cell;
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === "") return "—";
  return Array.isArray(raw) ? raw.join(", ") : String(raw);
}

function CellContent({ col, row }: { col: ColumnDef; row: Row }) {
  const value = displayValue(col, row);
  if (col.type === "badge") {
    const s = String(value);
    return s === "—" ? <span className="text-muted">—</span> : <StatusBadge value={s} />;
  }
  if (col.type === "money") {
    return <span className="font-medium tabular-nums">{formatMoney(value as number)}</span>;
  }
  if (col.type === "number") {
    return <span className="tabular-nums">{typeof value === "number" ? value.toLocaleString("en-IN") : String(value)}</span>;
  }
  if (col.type === "percent") {
    return <span className="tabular-nums">{Number(value) || 0}%</span>;
  }
  if (col.type === "code") {
    return <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{String(value)}</code>;
  }
  if (col.type === "date") {
    return <span className="whitespace-nowrap">{value === "—" ? "—" : formatDate(String(value))}</span>;
  }
  if (col.type === "datetime") {
    return <span className="whitespace-nowrap">{value === "—" ? "—" : formatDateTime(String(value))}</span>;
  }
  return <span className="block max-w-[320px] truncate">{String(value)}</span>;
}

function fieldText(field: ResolvedField, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "money") return formatMoney(value);
  if (field.type === "date") return formatDate(String(value));
  if (field.type === "datetime") return formatDateTime(String(value));
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

export function ResourcePage(props: ResourcePageProps) {
  const {
    resource,
    title,
    description,
    headerActions,
    rowActions,
    toolbarExtra,
    defaultFilters,
    defaultSort,
    hideFilters = [],
    stats,
    notice,
    customTable,
    detail,
    exportName,
    columnKeys,
  } = props;

  const { meta, loading: metaLoading, error: metaError, retry } = useMeta(resource);
  const [query, setQuery] = useState<QueryState>({ ...emptyQuery, sort: defaultSort ?? "", filters: defaultFilters ?? {} });
  const [searchDraft, setSearchDraft] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data, loading, error, refetch } = useResourceList<Row>(resource, query);
  const workflow = useWorkflow(resource);
  const rows = useMemo(() => data?.rows ?? [], [data]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery((q) => (q.q === searchDraft ? q : { ...q, q: searchDraft, page: 1 }));
    }, 280);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const ctx: PageContext = {
    refetch,
    openCreate: () => {
      setEditing(null);
      setFormOpen(true);
    },
    openEdit: (row) => {
      setEditing(row);
      setFormOpen(true);
    },
    query,
    setQuery,
    meta,
  };

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/${resource}/${deleting.id}`);
      toast.success(`${meta?.label ?? "Record"} deleted.`);
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }, [deleting, resource, meta, refetch]);

  const exportCsv = async () => {
    if (!meta) return;
    setBusy(true);
    try {
      const all = await api.get<{ rows: Row[]; total: number }>(`/api/${resource}`, { pageSize: 200, page: 1, q: query.q || undefined, ...Object.fromEntries(Object.entries(query.filters).filter(([, v]) => v).map(([k, v]) => [`f_${k}`, v])) });
      const columns = (meta as unknown as { columns?: ColumnDef[] }).columns ?? [];
      const exportCols = columns.length
        ? columns.map((c) => ({ key: c.key, label: c.label }))
        : meta.fields.filter((f) => f.inTable).map((f) => ({ key: f.name, label: f.label }));
      const flat = all.rows.map((r) => {
        const out: Record<string, unknown> = { id: r.id };
        for (const c of exportCols) out[c.key] = r.__cells?.[c.key] ?? r[c.key];
        return out;
      });
      downloadCsv(`${exportName ?? resource}-${new Date().toISOString().slice(0, 10)}`, toCsv(flat, exportCols));
      toast.success(`Exported ${flat.length} row(s) to CSV.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  if (metaLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} description={description ?? "Loading…"} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }
  if (metaError || !meta) return <ErrorState message={metaError ?? "Resource metadata unavailable."} onRetry={retry} />;

  const allColumns = (meta as unknown as { columns?: ColumnDef[] }).columns ?? [];
  const columns = columnKeys?.length ? columnKeys.map((k) => allColumns.find((c) => c.key === k)).filter((c): c is ColumnDef => Boolean(c)) : allColumns;
  const filters = (meta as unknown as { filters?: { field: string; label: string; options?: { value: string; label: string }[] }[] }).filters ?? [];
  const visibleFilters = filters.filter((f) => !hideFilters.includes(f.field));
  const activeFilterCount = Object.values(query.filters).filter(Boolean).length;
  const total = data?.total ?? 0;

  const sortBy = (key: string) =>
    setQuery((q) => ({ ...q, sort: q.sort === key ? key : key, dir: q.sort === key && q.dir === "asc" ? "desc" : "asc", page: 1 }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description ?? meta.description}
        actions={
          <>
            {headerActions?.(ctx)}
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              <Filter className="h-3.5 w-3.5" /> Filters
              {activeFilterCount ? <Badge tone="brand" size="sm">{activeFilterCount}</Badge> : null}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} loading={busy}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPdf(`${exportName ?? resource}`, title)}>
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="icon-sm" onClick={refetch} aria-label="Refresh">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
            {meta.canCreate ? (
              <Button size="sm" onClick={ctx.openCreate}>
                <Plus className="h-3.5 w-3.5" /> New {meta.label.toLowerCase()}
              </Button>
            ) : null}
          </>
        }
      />

      {notice}

      {stats?.(ctx)}

      <Toolbar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={meta.searchPlaceholder ?? `Search ${meta.labelPlural.toLowerCase()}…`}
            className="pl-9"
          />
          {searchDraft ? (
            <button onClick={() => setSearchDraft("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-[var(--text)]" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {toolbarExtra?.(ctx)}
        <Select
          value={String(query.pageSize)}
          onChange={(e) => setQuery((q) => ({ ...q, pageSize: Number(e.target.value), page: 1 }))}
          options={[
            { value: "10", label: "10 per page" },
            { value: "25", label: "25 per page" },
            { value: "50", label: "50 per page" },
            { value: "100", label: "100 per page" },
          ]}
          className="w-[130px]"
        />
      </Toolbar>

      {showFilters && visibleFilters.length ? (
        <div className="grid gap-3 rounded-xl border px-3 py-3 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {visibleFilters.map((f) => (
            <div key={f.field}>
              <p className="mb-1 text-[11.5px] font-medium text-muted">{f.label}</p>
              <Select
                options={[{ value: "", label: "All" }, ...(f.options ?? [])]}
                value={query.filters[f.field] ?? ""}
                onChange={(e) => setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, [f.field]: e.target.value } }))}
              />
            </div>
          ))}
          {activeFilterCount ? (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => setQuery((q) => ({ ...q, page: 1, filters: {} }))}>
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={10} cols={Math.min(6, columns.length) || 5} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={`No ${meta.labelPlural.toLowerCase()} found`}
            description={
              query.q || activeFilterCount
                ? "No records match the current search or filters."
                : `Create the first ${meta.label.toLowerCase()} record to get started.`
            }
            icon={Search}
            action={
              query.q || activeFilterCount ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchDraft("");
                    setQuery((q) => ({ ...q, page: 1, filters: {} }));
                  }}
                >
                  Clear search and filters
                </Button>
              ) : meta.canCreate ? (
                <Button size="sm" onClick={ctx.openCreate}>
                  <Plus className="h-3.5 w-3.5" /> New {meta.label.toLowerCase()}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {customTable ? null : (
              <TableWrap>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH className="w-10" />
                    {columns.map((c) => (
                      <TH
                        key={c.key}
                        align={c.align ?? (c.type === "money" || c.type === "number" || c.type === "percent" ? "right" : "left")}
                        onClick={() => sortBy(c.key)}
                        sorted={query.sort === c.key ? (query.dir === "asc" ? "asc" : "desc") : false}
                      >
                        {c.label}
                      </TH>
                    ))}
                    <TH className="w-10" align="right">
                      <span className="sr-only">Actions</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <TR key={row.id} onClick={() => (detail ? setViewing(row) : undefined)}>
                      <TD>
                        <span className="block h-1.5 w-1.5 rounded-full bg-mint-500/70" />
                      </TD>
                      {columns.map((c, i) => (
                        <TD key={c.key} align={c.align ?? (c.type === "money" || c.type === "number" || c.type === "percent" ? "right" : "left")} className={i === 0 ? "font-medium" : undefined}>
                          <CellContent col={c} row={row} />
                        </TD>
                      ))}
                      <TD align="right">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-md p-1.5 text-muted ring-focus transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Row actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {detail ? (
                                <DropdownMenuItem onSelect={() => setViewing(row)}>
                                  <Eye className="h-4 w-4" /> View details
                                </DropdownMenuItem>
                              ) : null}
                              {meta.canEdit ? (
                                <DropdownMenuItem onSelect={() => ctx.openEdit(row)}>
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                              ) : null}
                              {rowActions?.(row, ctx)}
                              {workflow.rowMenu(row, ctx)}
                              {meta.canDelete ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem destructive onSelect={() => setDeleting(row)}>
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </TableWrap>
            )}

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-[12.5px] text-muted">
                Showing <span className="font-medium text-[var(--text)]">{rows.length === 0 ? 0 : (query.page - 1) * query.pageSize + 1}</span>–
                <span className="font-medium text-[var(--text)]">{Math.min(query.page * query.pageSize, total)}</span> of{" "}
                <span className="font-medium text-[var(--text)]">{total.toLocaleString("en-IN")}</span>{" "}
                {meta.labelPlural.toLowerCase()}
                {loading ? <span className="ml-2 text-muted">· updating…</span> : null}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" disabled={query.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="px-2 text-[12.5px] tabular-nums text-muted">
                  Page {query.page} of {data?.pageCount ?? 1}
                </span>
                <Button variant="outline" size="sm" disabled={query.page >= (data?.pageCount ?? 1)} onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / edit */}
      {meta.canCreate ? (
        <ResourceFormDialog open={formOpen} onOpenChange={setFormOpen} meta={meta} row={editing} onSaved={refetch} />
      ) : null}

      {/* Workflow prompt dialog raised by a row action */}
      {workflow.dialog}

      {/* Delete confirmation */}      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete this ${meta.label.toLowerCase()}?`}
        description={`Record ${deleting?.id} will be permanently removed. Records referenced by payroll, invoices or deployments are protected and the delete will be refused with a reason.`}
        confirmLabel="Delete record"
        destructive
        busy={busy}
        onConfirm={confirmDelete}
      />

      {/* Detail view */}
      {detail && viewing ? (
        <Dialog open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>{String(viewing[meta.titleField ?? "name"] ?? viewing.id)}</DialogTitle>
              <DialogDescription>
                {meta.label} · {viewing.id}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {meta.fields
                  .filter((f) => !f.readOnly && viewing[f.name] !== undefined)
                  .map((f) => (
                    <div key={f.name} className={f.span === 4 || f.span === 3 ? "sm:col-span-2" : undefined}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{f.label}</p>
                      <p className="mt-0.5 text-[13.5px] break-words">{fieldText(f, viewing[f.name])}</p>
                    </div>
                  ))}
              </div>
              {detail(viewing, ctx)}
            </DialogBody>
            <DialogFooter>
              {meta.canEdit ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    ctx.openEdit(viewing);
                    setViewing(null);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              ) : null}
              <Button onClick={() => setViewing(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
