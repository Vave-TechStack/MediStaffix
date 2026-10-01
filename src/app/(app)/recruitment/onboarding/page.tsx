"use client";

/**
 * Onboarding board.
 *
 * Lists accepted and released offers and converts them into employee records in
 * a single audited step. The server refuses a repeat onboarding for a candidate
 * who is already on the payroll, so this screen is safe to retry.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardCheck, FileCheck2, UserPlus } from "lucide-react";
import { ResourcePage, type Row } from "@/components/resource/resource-page";
import { api } from "@/lib/client";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge, Button, DropdownMenuItem, Notice } from "@/components/ui";

const READY_STATES = ["Accepted", "Released", "Pending Response", "Negotiating"];

export default function OnboardingPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const onBoard = async (row: Row, refetch: () => void, force = false) => {
    setBusy(row.id);
    try {
      const res = await api.action<{ message?: string }>("onboarding.complete", {
        offerId: row.id,
        force,
      });
      toast.success(res.message ?? "Candidate onboarded onto the payroll.");
      refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Onboarding failed.";
      toast.error(message);
      if (/accepted before onboarding/i.test(message)) {
        const confirmOverride = window.confirm(`${message}\n\nOverride and onboard anyway?`);
        if (confirmOverride) {
          setBusy(null);
          await onBoard(row, refetch, true);
          return;
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const notice = useMemo(
    () => (
      <Notice tone="info">
        Onboarding creates the employee record, salary structure, leave balances, bank details placeholder and compliance documents in one
        audited transaction, and advances the application to <strong>Joined</strong>.
      </Notice>
    ),
    []
  );

  return (
    <ResourcePage
      resource="offers"
      title="Onboarding"
      description="Accepted offers awaiting conversion into employee records on the payroll."
      notice={notice}
      columnKeys={["offerCode", "candidateId", "requisitionId", "issuedAt", "joiningDate", "annualCtc", "status"]}
      hideFilters={["notes"]}
      rowActions={(row, ctx) => (
        <DropdownMenuItem
          disabled={busy === row.id || !READY_STATES.includes(String(row.status))}
          onSelect={() => onBoard(row, ctx.refetch)}
        >
          <UserPlus className="h-4 w-4" /> {busy === row.id ? "Onboarding…" : "Complete onboarding"}
        </DropdownMenuItem>
      )}
      headerActions={() => (
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/workforce/employees">
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" /> Employee register
              </span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" /> Compliance documents
              </span>
            </Link>
          </Button>
        </>
      )}
      exportName="onboarding"
      detail={(row) => (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Annual CTC", value: formatMoney(row.annualCtc as number) },
              { label: "Fixed / month", value: formatMoney((row.fixedSalary as number) ?? 0) },
              { label: "Variable / month", value: formatMoney((row.variablePay as number) ?? 0) },
            ].map((s) => (
              <div key={s.label} className="surface-card px-3 py-2.5">
                <p className="text-[11.5px] text-muted">{s.label}</p>
                <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">
            Issued {formatDate(String(row.issuedAt))} · joining {formatDate(String(row.joiningDate))} · offer expires{" "}
            {formatDate(String(row.expiresAt))}
          </p>
          <p className="text-[12.5px] text-muted">
            <Badge tone="neutral" size="sm">
              {String(row.status)}
            </Badge>{" "}
            — offers must be accepted before onboarding will proceed, unless the override is confirmed.
          </p>
        </div>
      )}
    />
  );
}
