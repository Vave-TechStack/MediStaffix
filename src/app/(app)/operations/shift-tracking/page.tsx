"use client";

/**
 * Shift tracking board.
 *
 * Grouped by date so an operations manager can see coverage gaps at a glance
 * rather than scanning a flat roster. Shift swaps go through the real workflow.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Repeat2, Users } from "lucide-react";
import { useAggregate, useResourceList, emptyQuery, type QueryState } from "@/lib/client";
import { api } from "@/lib/client";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  KpiCard,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  TableSkeleton,
  Toolbar,
  Input,
} from "@/components/ui";
import { GenericBars } from "@/components/charts";

interface ShiftRow extends Record<string, unknown> {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  swapRequestFrom?: string;
  swapRequestTo?: string;
  /** Resolved display values computed server-side for each column. */
  __cells?: Record<string, string | number>;
}

const staffOf = (r: ShiftRow) => String(r.__cells?.deploymentId ?? "—");
const hospitalOf = (r: ShiftRow) => String(r.__cells?.hospitalId ?? "—");

interface OpsAggregate {
  shiftCoverage: { type: string; scheduled: number; completed: number; missed: number }[];
}

export default function ShiftTrackingPage() {
  const [query, setQuery] = useState<QueryState>({ ...emptyQuery, pageSize: 200, sort: "date", dir: "desc" });
  const [swapTarget, setSwapTarget] = useState<ShiftRow | null>(null);
  const [swapTo, setSwapTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const ops = useAggregate<OpsAggregate>("operations");
  const shifts = useResourceList<ShiftRow>("shifts", query);

  const rows = useMemo(() => shifts.data?.rows ?? [], [shifts.data]);

  const byDate = useMemo(() => {
    const groups = new Map<string, ShiftRow[]>();
    for (const r of rows) {
      const list = groups.get(r.date) ?? [];
      list.push(r);
      groups.set(r.date, list);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [rows]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.status === "Completed").length;
    const missed = rows.filter((r) => r.status === "Missed").length;
    const swaps = rows.filter((r) => r.swapRequestFrom).length;
    return { completed, missed, swaps, total: rows.length };
  }, [rows]);

  const eligible = useMemo(
    () =>
      swapTarget
        ? rows.filter((r) => r.date === swapTarget.date && r.id !== swapTarget.id && (r.type === "Day" || r.type === "Night"))
        : [],
    [rows, swapTarget]
  );

  const requestSwap = async () => {
    if (!swapTarget || !swapTo) return;
    setBusy(true);
    try {
      const res = await api.action<{ message?: string }>("shift.swap", {
        shiftId: swapTarget.id,
        toEmployeeId: swapTo,
        reason,
      });
      toast.success(res.message ?? "Shift swap requested.");
      setSwapTarget(null);
      setReason("");
      setSwapTo("");
      shifts.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request the swap.");
    } finally {
      setBusy(false);
    }
  };

  const decideSwap = async (row: ShiftRow, approve: boolean) => {
    setBusy(true);
    try {
      const res = await api.action<{ message?: string }>("shift.swap-decide", { shiftId: row.id, approve });
      toast.success(res.message ?? (approve ? "Swap approved." : "Swap rejected."));
      shifts.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decide the swap.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shift Tracking"
        description="Live shift board grouped by date, with coverage status and swap approval for deployed staff."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Shifts in view" value={stats.total} sub={`${byDate.length} day(s) grouped`} tone="brand" />
        <KpiCard label="Completed" value={stats.completed} sub={`${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}% of tracked shifts`} tone="success" />
        <KpiCard label="Missed" value={stats.missed} sub="Needs replacement or backfill" tone="danger" />
        <KpiCard label="Swap requests" value={stats.swaps} sub="Awaiting a decision" tone="warning" />
      </div>

      <Toolbar>
        <div className="relative min-w-[200px] flex-1">
          <Input
            value={query.q}
            onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value, page: 1 }))}
            placeholder="Search by employee or hospital…"
          />
        </div>
        <Select
          options={[
            { value: "", label: "All shift types" },
            ...["Day", "Night", "Rotational", "General", "On Call"].map((v) => ({ value: v, label: v })),
          ]}
          value={String(query.filters.type ?? "")}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, type: e.target.value } }))}
          className="w-[160px]"
        />
        <Select
          options={[
            { value: "", label: "Any status" },
            ...["Scheduled", "In Progress", "Completed", "Missed", "Cancelled"].map((v) => ({ value: v, label: v })),
          ]}
          value={String(query.filters.status ?? "")}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, status: e.target.value } }))}
          className="w-[150px]"
        />
      </Toolbar>

      {ops.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Coverage by shift type</CardTitle>
            <CardDescription>Scheduled against completed and missed duty across the whole roster.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenericBars
              data={ops.data.shiftCoverage as unknown as Record<string, unknown>[]}
              xKey="type"
              series={[
                { key: "scheduled", label: "Scheduled" },
                { key: "completed", label: "Completed" },
                { key: "missed", label: "Missed" },
              ]}
              stacked
              height={220}
              formatValue={(v) => String(Math.round(v))}
            />
          </CardContent>
        </Card>
      ) : null}

      {shifts.error ? (
        <ErrorState message={shifts.error} onRetry={shifts.refetch} />
      ) : shifts.loading && !shifts.data ? (
        <TableSkeleton rows={10} cols={5} />
      ) : byDate.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState title="No shifts in this view" description="Adjust the filters or date range to see rostered duty." icon={CalendarCheck} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byDate.map(([date, list]) => {
            const missed = list.filter((r) => r.status === "Missed").length;
            return (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-brand-500" />
                    {formatDate(date)}
                    <Badge tone="neutral" size="sm">
                      {list.length} shift(s)
                    </Badge>
                    {missed ? <Badge tone="danger" size="sm">{missed} missed</Badge> : null}
                  </CardTitle>
                  <CardDescription>
                    {list.filter((r) => r.type === "Day").length} day · {list.filter((r) => r.type === "Night").length} night ·{" "}
                    {new Set(list.map((r) => hospitalOf(r))).size} hospital(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.slice(0, 12).map((r) => (
                    <div key={r.id} className="surface-card px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{staffOf(r)}</p>
                          <p className="truncate text-[11.5px] text-muted">{hospitalOf(r)}</p>
                        </div>
                        <StatusBadge value={r.status} />
                      </div>
                      <p className="mt-1.5 text-[11.5px] tabular-nums text-muted">
                        {formatTime(r.startTime)} – {formatTime(r.endTime)} · {r.type}
                      </p>
                      {r.swapRequestFrom ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                          <Badge tone="warning" size="sm">
                            <Repeat2 className="h-3 w-3" /> Swap pending
                          </Badge>
                          <Button size="sm" variant="outline" loading={busy} onClick={() => decideSwap(r, true)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" loading={busy} onClick={() => decideSwap(r, false)}>
                            Reject
                          </Button>
                        </div>
                      ) : r.status === "Scheduled" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 w-full"
                          onClick={() => {
                            setSwapTarget(r);
                            setSwapTo("");
                          }}
                        >
                          <Repeat2 className="h-3.5 w-3.5" /> Request swap
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {list.length > 12 ? <p className="col-span-full text-[12px] text-muted">+{list.length - 12} more shifts on this date.</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(swapTarget)} onOpenChange={(v) => !v && setSwapTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a shift swap</DialogTitle>
            <DialogDescription>
              {swapTarget ? staffOf(swapTarget) : "—"} · {formatDate(swapTarget?.date)} · {formatTime(swapTarget?.startTime)} –{" "}
              {formatTime(swapTarget?.endTime)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {eligible.length === 0 ? (
              <Notice tone="warning">
                No other day or night shift exists on this date, so there is nobody to hand the duty to.
              </Notice>
            ) : (
              <>
                <div>
                  <p className="mb-1 text-[12px] font-medium text-muted">Hand over to</p>
                  <Select
                    options={eligible.map((r) => ({ value: String(staffOf(r)), label: `${staffOf(r)} — ${formatTime(r.startTime)} to ${formatTime(r.endTime)}` }))}
                    value={swapTo}
                    onChange={(e) => setSwapTo(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[12px] font-medium text-muted">Reason</p>
                  <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Personal commitment, medical appointment…" />
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapTarget(null)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!swapTo} onClick={requestSwap}>
              <Users className="h-4 w-4" /> Raise swap request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
