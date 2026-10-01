"use client";

/**
 * Replacement requests.
 *
 * A replacement starts from a deployment, not from a form: the workflow marks the
 * deployment, opens a linked service request and notifies the hospital. This page
 * lists deployments and lets the operator raise a replacement against one.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Repeat2, Siren } from "lucide-react";
import { ResourcePage, type Row } from "@/components/resource/resource-page";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import { Button, DropdownMenuItem, Notice } from "@/components/ui";

export default function ReplacementsPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const requestReplacement = async (row: Row, refetch: () => void) => {
    setBusy(row.id);
    try {
      const res = await api.action<{ message?: string }>("deployment.replace", {
        id: row.id,
        reason: "Replacement requested from the replacements queue.",
        priority: "High",
      });
      toast.success(res.message ?? "Replacement request raised.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not raise the replacement request.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ResourcePage
      resource="deployments"
      title="Replacement Requests"
      description="Deployments available for backfill, and the service request raised when a replacement is requested."
      notice={
        <Notice tone="warning">
          Raising a replacement flags the deployment, opens a linked service request against the hospital and notifies the operations and client
          teams. The outgoing doctor is only released once a replacement deployment is confirmed.
        </Notice>
      }
      columnKeys={["deploymentCode", "hospitalId", "employeeId", "designation", "startDate", "endDate", "replacementStatus", "status"]}
      rowActions={(row, ctx) =>
        row.replacementStatus === "Replaced" || row.replacementStatus === "Not Required" ? (
          <DropdownMenuItem
            disabled={busy === row.id}
            onSelect={() => requestReplacement(row, ctx.refetch)}
          >
            <Repeat2 className="h-4 w-4" /> {busy === row.id ? "Raising…" : "Request replacement"}
          </DropdownMenuItem>
        ) : null
      }
      headerActions={() => (
        <Button variant="outline" size="sm" asChild>
          <Link href="/operations/service-requests">
            <span className="flex items-center gap-1.5">
              <Siren className="h-3.5 w-3.5" /> Open service requests
            </span>
          </Link>
        </Button>
      )}
      exportName="replacement-requests"
      detail={(row) => (
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Backfill window</p>
          <p className="mt-1 text-[13.5px]">
            {formatDate(String(row.startDate))} to {formatDate(String(row.endDate))} · replacement status{" "}
            <strong>{String(row.replacementStatus)}</strong>
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            A replacement allocation inherits this deployment&apos;s hospital, shift pattern and contract rate, so margin is preserved.
          </p>
        </div>
      )}
    />
  );
}
