"use client";

/**
 * Doctor allocation console.
 *
 * Reads live hospital requirements alongside the unallocated doctor pool, then
 * performs a real allocation through the `requirement.allocate` workflow. The
 * server derives salary from the employee's salary structure and billing from
 * the hospital's contract rate, so the dialog previews those figures rather
 * than accepting client-supplied amounts that would be ignored.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HeartPulse, RefreshCw, Shuffle, UserCheck, Users } from "lucide-react";
import { api, useAggregate, useResourceList, emptyQuery, type QueryState } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/utils";
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
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";

interface RequirementRow extends Record<string, unknown> {
  id: string;
  referenceNo: string;
  hospitalId: string;
  designation: string;
  category: string;
  shiftRequirement: string;
  count: number;
  allocated: number;
  priority: string;
  status: string;
  targetDate: string;
  budgetPerDoctor: number;
}

interface AvailableDoctor {
  id: string;
  name: string;
  designation: string;
  specialization: string;
  experience: number;
  state: string;
  monthlyCost: number;
}

interface OpsAggregate {
  byHospital: { hospital: string; required: number; allocated: number; deployed: number }[];
  openRequirements: number;
}

const SHIFTS = ["Day", "Night", "Rotational", "General", "On Call"];

export default function AllocationsPage() {
  const [query, setQuery] = useState<QueryState>({ ...emptyQuery, pageSize: 50, filters: { status: "Open" } });
  const [doctors, setDoctors] = useState<AvailableDoctor[] | null>(null);
  const [target, setTarget] = useState<RequirementRow | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [shift, setShift] = useState("Rotational");
  const [busy, setBusy] = useState(false);

  const reqs = useResourceList<RequirementRow>("requirements", query);
  const ops = useAggregate<OpsAggregate>("operations");

  const rows = useMemo(() => reqs.data?.rows ?? [], [reqs.data]);
  const unmet = useMemo(() => rows.filter((r) => r.allocated < r.count), [rows]);
  const chosen = useMemo(() => doctors?.find((d) => d.id === doctorId) ?? null, [doctors, doctorId]);

  const loadDoctors = async () => {
    setBusy(true);
    try {
      const res = await api.get<{ doctors: AvailableDoctor[] }>("/api/actions/available-doctors");
      setDoctors(res.doctors);
      if (!res.doctors.length) toast.info("No unallocated doctors are currently available.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the available pool.");
    } finally {
      setBusy(false);
    }
  };

  const allocate = async () => {
    if (!target || !doctorId) return;
    setBusy(true);
    try {
      const res = await api.action<{ message?: string }>("requirement.allocate", {
        requirementId: target.id,
        employeeId: doctorId,
        shift,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: target.targetDate,
      });
      toast.success(res.message ?? "Doctor allocated and deployment created.");
      setTarget(null);
      setDoctorId("");
      reqs.refetch();
      ops.refetch();
      if (doctors) loadDoctors();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Allocation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Doctor Allocations"
        description="Match open hospital requirements against the available doctor pool and create the deployment in one step."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadDoctors} loading={busy}>
              <RefreshCw className="h-3.5 w-3.5" /> Load available doctors
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuery((q) => ({ ...q, filters: {} }))}>
              Show all requirements
            </Button>
          </>
        }
      />

      <Notice tone="info">
        The server blocks a doctor who already holds an active deployment, requires the hospital to have a contract with a billing rate, and
        sets salary from the employee&apos;s salary structure — so the figures previewed in the dialog are the figures that get stored.
      </Notice>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open requirements</CardTitle>
            <CardDescription>
              {unmet.length} of {rows.length} shown requirements still have unmet headcount
              {ops.data ? ` · ${ops.data.openRequirements} open in total` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reqs.error ? (
              <ErrorState message={reqs.error} onRetry={reqs.refetch} />
            ) : reqs.loading && !reqs.data ? (
              <TableSkeleton rows={6} cols={6} />
            ) : rows.length === 0 ? (
              <EmptyState title="No requirements found" description="Nothing is outstanding for the current filter." icon={HeartPulse} />
            ) : (
              <TableWrap>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Ref</TH>
                    <TH>Designation</TH>
                    <TH>Category</TH>
                    <TH align="right">Headcount</TH>
                    <TH align="right">Budget</TH>
                    <TH align="right">Target</TH>
                    <TH align="right">Action</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r) => {
                    const gap = r.count - r.allocated;
                    return (
                      <TR key={r.id}>
                        <TD>
                          <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px]">{r.referenceNo}</code>
                        </TD>
                        <TD className="font-medium">{r.designation}</TD>
                        <TD>
                          <Badge tone="neutral" size="sm">
                            {r.category}
                          </Badge>
                        </TD>
                        <TD align="right">
                          <span className={gap > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted"}>
                            {r.allocated}/{r.count}
                          </span>
                        </TD>
                        <TD align="right">{formatMoney(r.budgetPerDoctor, { compact: true })}</TD>
                        <TD align="right" className="whitespace-nowrap">
                          {formatDate(r.targetDate)}
                        </TD>
                        <TD align="right">
                          <Button
                            size="sm"
                            variant={gap > 0 ? "primary" : "outline"}
                            disabled={gap <= 0}
                            onClick={() => {
                              setTarget(r);
                              setShift(r.shiftRequirement || "Rotational");
                              setDoctorId("");
                            }}
                          >
                            <Shuffle className="h-3.5 w-3.5" /> Allocate
                          </Button>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </TableWrap>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available doctors</CardTitle>
            <CardDescription>Registered, active doctors with no overlapping deployment.</CardDescription>
          </CardHeader>
          <CardContent>
            {doctors === null ? (
              <EmptyState
                title="Pool not loaded"
                description="Load the available pool to see who can be allocated right now."
                icon={Users}
                action={
                  <Button size="sm" onClick={loadDoctors} loading={busy}>
                    Load pool
                  </Button>
                }
              />
            ) : doctors.length === 0 ? (
              <EmptyState title="No available doctors" description="Every registered doctor currently holds an active deployment." icon={Users} />
            ) : (
              <ul className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
                {doctors.map((d) => (
                  <li key={d.id} className="surface-card flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{d.name}</p>
                      <p className="truncate text-[12px] text-muted">
                        {d.specialization} · {d.experience} yrs · {d.state}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] tabular-nums text-muted">{formatMoney(d.monthlyCost, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(target)} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate doctor to {target?.referenceNo}</DialogTitle>
            <DialogDescription>
              {(target?.count ?? 0) - (target?.allocated ?? 0)} more {target?.designation} required, shift pattern {target?.shiftRequirement}, target date{" "}
              {formatDate(target?.targetDate)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <p className="mb-1 text-[12px] font-medium text-muted">Doctor</p>
              <Select
                options={(doctors ?? []).map((d) => ({ value: d.id, label: `${d.name} — ${d.specialization} (${d.experience} yrs)` }))}
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                placeholder={doctors === null ? "Load the available pool first" : "Select a doctor"}
              />
            </div>
            <div>
              <p className="mb-1 text-[12px] font-medium text-muted">Shift pattern</p>
              <Select options={SHIFTS.map((v) => ({ value: v, label: v }))} value={shift} onChange={(e) => setShift(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-card px-3 py-2.5">
                <p className="text-[11.5px] text-muted">Monthly salary (from salary structure)</p>
                <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{chosen ? formatMoney(chosen.monthlyCost) : "—"}</p>
              </div>
              <div className="surface-card px-3 py-2.5">
                <p className="text-[11.5px] text-muted">Hospital budget per doctor</p>
                <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{formatMoney(target?.budgetPerDoctor ?? 0)}</p>
              </div>
            </div>
            <p className="text-[12.5px] text-muted">
              The billing rate actually applied comes from the hospital&apos;s contract, not from the requirement budget. If no rate exists for this
              designation the allocation is refused with a reason.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!doctorId} onClick={allocate}>
              <UserCheck className="h-4 w-4" /> Create deployment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ops.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Demand vs deployment by hospital</CardTitle>
            <CardDescription>Required headcount against doctors actually deployed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ops.data.byHospital.slice(0, 12).map((h) => {
              const max = Math.max(1, h.required, h.deployed);
              return (
                <div key={h.hospital} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium">{h.hospital}</p>
                    <div className="mt-1 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                        <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${(h.required / max) * 100}%` }} />
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                        <div className="h-full rounded-full bg-mint-600/80" style={{ width: `${(h.deployed / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-[12px] tabular-nums text-muted">
                    <StatusBadge value={h.deployed >= h.required ? "Fully staffed" : "Staffing gap"} />
                    {h.deployed}/{h.required}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
