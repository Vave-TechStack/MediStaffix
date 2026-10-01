"use client";

/**
 * Doctor directory.
 *
 * A searchable card grid rather than a table, because recruiters scan for people
 * — specialisation, experience, registration and current placement — and open a
 * profile drawer to read the detail.
 */

import { useMemo, useState } from "react";
import { BadgeCheck, HeartPulse, Mail, MapPin, Phone, Search, Stethoscope } from "lucide-react";
import { useAggregate } from "@/lib/client";
import { formatDate, formatMoney, initials } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  KpiCard,
  PageHeader,
  Select,
  StatusBadge,
  Toolbar,
} from "@/components/ui";

interface DoctorRow {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  city: string;
  state: string;
  specialisation: string;
  categories: string[];
  registrationCouncil: string;
  registrationNumber: string;
  experienceYears: number;
  languages: string[];
  preferredShift: string;
  employmentStatus: string;
  dateOfJoining: string;
  deploymentCode: string;
  hospital: string;
  shift: string;
  presentDays: number;
  absentDays: number;
  overtimeHours: number;
  monthlyCost: number;
  leaveBalance: number;
  totalDeployments: number;
  availability: string;
}

interface DoctorsPayload {
  rows: DoctorRow[];
  totals: { doctors: number; available: number; deployed: number; specialisations: number };
  period: string;
}

export default function DoctorDirectoryPage() {
  const [q, setQ] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [availability, setAvailability] = useState("");
  const [open, setOpen] = useState<DoctorRow | null>(null);
  const { data, loading, error, refetch } = useAggregate<DoctorsPayload>("doctors");

  const specialisations = useMemo(
    () => [...new Set((data?.rows ?? []).map((r) => r.specialisation))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => {
      if (specialisation && r.specialisation !== specialisation) return false;
      if (availability && r.availability !== availability) return false;
      if (!needle) return true;
      return [r.name, r.designation, r.specialisation, r.registrationNumber, r.city, r.state, r.hospital]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data, q, specialisation, availability]);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Doctor Directory"
        description="Every registered doctor with council verification, current placement and live attendance for this period."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Registered doctors" value={data?.totals.doctors ?? 0} sub={`${data?.totals.specialisations ?? 0} specialisations on record`} tone="brand" />
        <KpiCard label="Available now" value={data?.totals.available ?? 0} sub="No overlapping active deployment" tone="success" />
        <KpiCard label="Currently deployed" value={data?.totals.deployed ?? 0} sub="Holding an active placement" tone="info" />
        <KpiCard
          label={`Attendance · ${data?.period ?? ""}`}
          value={`${filtered.length ? Math.round((filtered.reduce((s, r) => s + r.presentDays, 0) / Math.max(1, filtered.reduce((s, r) => s + r.presentDays + r.absentDays, 0))) * 100) : 0}%`}
          sub="Present days across the filtered set"
          tone="warning"
        />
      </div>

      <Toolbar>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, speciality, registration or city…" className="pl-9" />
        </div>
        <Select
          options={[{ value: "", label: "All specialities" }, ...specialisations.map((s) => ({ value: s, label: s }))]}
          value={specialisation}
          onChange={(e) => setSpecialisation(e.target.value)}
          className="w-[200px]"
        />
        <Select
          options={[
            { value: "", label: "Any availability" },
            { value: "Available", label: "Available" },
            { value: "Deployed", label: "Deployed" },
          ]}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="w-[170px]"
        />
      </Toolbar>

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="h-40 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <Card>
            <EmptyState title="No doctors match" description="Clear the search or filters to see the full directory." icon={HeartPulse} />
          </Card>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 60).map((d) => (
            <button
              key={d.id}
              onClick={() => setOpen(d)}
              className="surface-card flex flex-col gap-3 p-4 text-left ring-focus transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(18,48,71,0.5)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-semibold text-white"
                  style={{ background: "var(--brand-600)" }}
                  aria-hidden
                >
                  {initials(d.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{d.name}</p>
                  <p className="truncate text-[12.5px] text-muted">{d.designation}</p>
                </div>
                <StatusBadge value={d.availability} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge tone="brand" size="sm">
                  <Stethoscope className="h-3 w-3" /> {d.specialisation}
                </Badge>
                <Badge tone="neutral" size="sm">
                  {d.experienceYears} yrs
                </Badge>
                {d.categories.slice(0, 1).map((c) => (
                  <Badge key={c} tone="info" size="sm">
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="mt-auto space-y-1 border-t pt-2.5 text-[12px] text-muted" style={{ borderColor: "var(--border)" }}>
                <p className="flex items-center gap-1.5 truncate">
                  <BadgeCheck className="h-3.3 w-3.3 shrink-0 text-mint-600" />
                  {d.registrationCouncil} · {d.registrationNumber}
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.3 w-3.3 shrink-0" />
                  {d.hospital ? `${d.hospital} (${d.shift})` : `${d.city || "—"}, ${d.state || "—"}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {filtered.length > 60 ? (
        <p className="text-center text-[12.5px] text-muted">Showing the first 60 of {filtered.length} matching doctors — narrow the search to see more.</p>
      ) : null}

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{open?.name}</DialogTitle>
            <DialogDescription>
              {open?.designation} · {open?.specialisation} · {open?.employeeCode}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {open ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Experience", value: `${open.experienceYears} yrs` },
                    { label: "Present days", value: String(open.presentDays) },
                    { label: "Overtime", value: `${open.overtimeHours} hrs` },
                    { label: "Leave balance", value: `${open.leaveBalance} days` },
                  ].map((s) => (
                    <div key={s.label} className="surface-card px-3 py-2.5">
                      <p className="text-[11.5px] text-muted">{s.label}</p>
                      <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Registration</p>
                    <p className="mt-1 text-[13.5px]">
                      {open.registrationCouncil}
                      <br />
                      {open.registrationNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Employment</p>
                    <p className="mt-1 text-[13.5px]">
                      <StatusBadge value={open.employmentStatus} /> · joined {formatDate(open.dateOfJoining)}
                      <br />
                      {open.totalDeployments} deployment(s) on record
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Current placement</p>
                    <p className="mt-1 text-[13.5px]">
                      {open.hospital ? `${open.hospital} — ${open.shift}` : "Not currently deployed"}
                      <br />
                      {open.deploymentCode || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cost to company</p>
                    <p className="mt-1 text-[13.5px]">{formatMoney(open.monthlyCost)} per month</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {open.languages.map((l) => (
                    <Badge key={l} tone="neutral" size="sm">
                      {l}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 border-t pt-3 text-[12.5px] text-muted" style={{ borderColor: "var(--border)" }}>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {open.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {open.phone}
                  </span>
                </div>
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
