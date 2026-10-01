"use client";

/**
 * Row-level workflow actions.
 *
 * Each resource maps to the domain actions that move it forward. The menu is
 * derived from the row's current status, so a record only ever offers the
 * transitions that are valid from where it is. Every entry still goes through
 * the action dispatcher, which re-checks the permission server-side.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightCircle,
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCheck,
  FileCheck2,
  FileSignature,
  Handshake,
  MessageSquarePlus,
  PhoneCall,
  RefreshCcw,
  Send,
  ShieldAlert,
  Undo2,
  UserPlus,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import type { PageContext, Row } from "./resource-page";

type Run = (payload: Record<string, unknown>, label: string) => Promise<void>;

const LEAD_STAGES = ["New", "Contacted", "Qualified", "Negotiation", "Won", "Lost"];
const APPLICATION_STAGES = [
  "Applied",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Offer Released",
  "Joined",
  "Rejected",
];
const INVOICE_STATUSES = ["Draft", "Pending Approval", "Approved", "Sent", "Partially Paid", "Paid", "Overdue"];
const DEPLOYMENT_STATUSES = ["Proposed", "Confirmed", "Active", "On Notice", "Completed", "Terminated"];
const SERVICE_REQUEST_STATUSES = ["Open", "Acknowledged", "In Progress", "Resolved", "Closed", "Cancelled"];

export function useWorkflow(resource: string) {
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<PromptState | null>(null);

  const run: Run = async (payload, label) => {
    setBusy(true);
    try {
      const res = await api.action<{ message?: string }>(payload.__action as string, stripAction(payload));
      toast.success(res.message ?? label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The action failed.");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const dialog = prompt ? (
    <PromptDialog
      state={prompt}
      busy={busy}
      onCancel={() => setPrompt(null)}
      onSubmit={async (values) => {
        await run({ ...values, __action: prompt.action }, prompt.submitLabel);
        setPrompt(null);
      }}
    />
  ) : null;

  const rowMenu = (row: Row, ctx: PageContext) => {
    const menu = MENUS[resource];
    if (!menu) return null;
    // Every successful action refreshes the table it was fired from, so the list
    // always reflects the new status without a manual reload.
    const runAndRefresh: Run = async (payload, label) => {
      await run(payload, label);
      ctx.refetch();
    };
    return menu(row, ctx, runAndRefresh, setPrompt);
  };
  return { rowMenu, dialog };
}

function stripAction(payload: Record<string, unknown>) {
  const { __action, ...rest } = payload;
  return rest;
}

interface PromptState {
  title: string;
  description?: string;
  action: string;
  submitLabel: string;
  fields: { name: string; label: string; type: "text" | "textarea" | "date" | "select"; options?: string[]; required?: boolean; value?: string }[];
}

function PromptDialog({
  state,
  busy,
  onCancel,
  onSubmit,
}: {
  state: PromptState;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(state.fields.map((f) => [f.name, f.value ?? ""]))
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description ? <DialogDescription>{state.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody className="space-y-3">
          {state.fields.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  id={f.name}
                  className="mt-1"
                  options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              ) : f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  rows={3}
                  className="mt-1"
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              ) : (
                <Input
                  id={f.name}
                  type={f.type}
                  className="mt-1"
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </DialogBody>
        <DialogFooter>
          <button className="rounded-lg px-3 py-2 text-[13px] text-muted ring-focus hover:bg-[var(--surface-2)]" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-medium text-white ring-focus transition-colors hover:bg-brand-700 disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit(values)}
          >
            {busy ? "Working…" : state.submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type MenuFn = (row: Row, ctx: PageContext, run: Run, prompt: (p: PromptState) => void) => React.ReactNode;

const nextOf = (list: string[], current: string) => {
  const i = list.indexOf(current);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
};

const MENUS: Record<string, MenuFn> = {
  leads: (row, ctx, run, prompt) => {
    const stage = String(row.stage ?? "");
    const next = nextOf(LEAD_STAGES, stage);
    return (
      <>
        {next ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Move ${row.organization ?? row.id} to ${next}`,
                description: "Stage changes are validated against the pipeline and recorded in the activity log.",
                action: "lead.move",
                submitLabel: `Move to ${next}`,
                fields: [
                  { name: "id", label: "Lead", type: "text", value: row.id },
                  { name: "stage", label: "New stage", type: "select", options: LEAD_STAGES, value: next },
                  { name: "note", label: "Note", type: "textarea" },
                ],
              })
            }
          >
            <ArrowRightCircle className="h-4 w-4" /> Move to {next}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: `Log an activity for ${row.organization ?? row.id}`,
              description: "Simulated communication log. No message is dispatched by this system.",
              action: "lead.activity",
              submitLabel: "Log activity",
              fields: [
                { name: "leadId", label: "Lead", type: "text", value: row.id },
                {
                  name: "type",
                  label: "Type",
                  type: "select",
                  options: ["Call", "Email", "Meeting", "Note", "Site Visit", "Proposal"],
                  value: "Call",
                },
                { name: "summary", label: "Summary", type: "text" },
                { name: "details", label: "Details", type: "textarea" },
              ],
            })
          }
        >
          <PhoneCall className="h-4 w-4" /> Log activity
        </DropdownMenuItem>
        {["Qualified", "Negotiation", "Won"].includes(stage) ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Convert ${row.organization ?? row.id} to a hospital`,
                description: "Creates a hospital account with the lead's details and links it back to the lead.",
                action: "lead.convert",
                submitLabel: "Convert lead",
                fields: [
                  { name: "id", label: "Lead", type: "text", value: row.id },
                  { name: "city", label: "City", type: "text", value: String(row.city ?? "") },
                  { name: "state", label: "State", type: "text", value: String(row.state ?? "") },
                  { name: "contactPerson", label: "Contact person", type: "text", value: String(row.contactPerson ?? "") },
                  { name: "hrManager", label: "HR manager", type: "text" },
                ],
              })
            }
          >
            <Handshake className="h-4 w-4" /> Convert to hospital
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            void run({ __action: "lead.move", id: row.id, stage: "Lost", note: "Marked as not proceeding." }, "Lead closed as lost.").catch(() => undefined)
          }
        >
          <Ban className="h-4 w-4" /> Mark as lost
        </DropdownMenuItem>
      </>
    );
  },

  followups: (row, ctx, run) =>
    row.status === "Pending" ? (
      <DropdownMenuItem
        onSelect={() =>
          void run({ __action: "followup.complete", id: row.id }, "Follow-up marked complete.").catch(() => undefined)
        }
      >
        <CheckCheck className="h-4 w-4" /> Mark complete
      </DropdownMenuItem>
    ) : null,

  contracts: (row, ctx, run) => (
    <DropdownMenuItem
      onSelect={() =>
        run(
          { __action: "contract.renew", id: row.id, months: 12 },
          `Contract ${row.number ?? row.id} renewed for 12 months.`
        ).catch(() => undefined)
      }
    >
      <FileSignature className="h-4 w-4" /> Renew contract
    </DropdownMenuItem>
  ),

  candidates: (row, ctx, run, prompt) => (
    <DropdownMenuItem
      onSelect={() =>
        prompt({
          title: `Set credential status for ${row.name ?? row.id}`,
          description: "Demonstration workflow state only — this is not a real council verification.",
          action: "candidate.verify",
          submitLabel: "Update verification",
          fields: [
            { name: "id", label: "Candidate", type: "text", value: row.id },
            {
              name: "verificationStatus",
              label: "Verification status",
              type: "select",
              options: ["Pending", "In Progress", "Verified", "Rejected"],
              value: String(row.verificationStatus ?? "Verified"),
            },
          ],
        })
      }
    >
      <BadgeCheck className="h-4 w-4" /> Set verification
    </DropdownMenuItem>
  ),

  applications: (row, ctx, run, prompt) => {
    const stage = String(row.stage ?? "");
    const next = nextOf(APPLICATION_STAGES, stage);
    return (
      <>
        {next ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Move application to ${next}`,
                description: `${row.candidateName ?? row.candidateId} · currently at ${stage}.`,
                action: "application.stage",
                submitLabel: `Move to ${next}`,
                fields: [
                  { name: "id", label: "Application", type: "text", value: row.id },
                  { name: "stage", label: "New stage", type: "select", options: APPLICATION_STAGES, value: next },
                  ...(next === "Interview Scheduled"
                    ? [
                        {
                          name: "scheduledAt",
                          label: "Schedule for",
                          type: "date" as const,
                          value: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
                        },
                      ]
                    : []),
                  ...(next === "Rejected"
                    ? [{ name: "reason", label: "Rejection reason", type: "text" as const, required: true }]
                    : []),
                ],
              })
            }
          >
            <ArrowRightCircle className="h-4 w-4" /> Move to {next}
          </DropdownMenuItem>
        ) : null}
        {stage !== "Rejected" ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: "Reject this application",
                description: "The reason is stored against the application and reported in recruitment analytics.",
                action: "application.stage",
                submitLabel: "Reject application",
                fields: [
                  { name: "id", label: "Application", type: "text", value: row.id },
                  { name: "stage", label: "Stage", type: "text", value: "Rejected" },
                  { name: "reason", label: "Reason", type: "text", required: true, value: "Did not meet the required experience" },
                ],
              })
            }
          >
            <Ban className="h-4 w-4" /> Reject
          </DropdownMenuItem>
        ) : null}
      </>
    );
  },

  interviews: (row, ctx, run, prompt) =>
    row.status === "Scheduled" ? (
      <DropdownMenuItem
        onSelect={() =>
          prompt({
            title: `Record the interview outcome for ${row.candidateName ?? row.candidateId}`,
            description: "A rejection here also rejects the underlying application with the panel feedback as the reason.",
            action: "interview.complete",
            submitLabel: "Record outcome",
            fields: [
              { name: "id", label: "Interview", type: "text", value: row.id },
              {
                name: "result",
                label: "Result",
                type: "select",
                options: ["Recommended", "Strongly Recommended", "Not Recommended", "No Show"],
                value: "Recommended",
              },
              { name: "feedback", label: "Panel feedback", type: "textarea" },
            ],
          })
        }
      >
        <CheckCheck className="h-4 w-4" /> Record outcome
      </DropdownMenuItem>
    ) : null,

  offers: (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    return (
      <>
        {["Draft", "Pending Approval", "Approved"].includes(status) ? (
          <DropdownMenuItem
            onSelect={() =>
              run({ __action: "offer.release", id: row.id }, `Offer ${row.offerCode ?? row.id} released.`).catch(() => undefined)
            }
          >
            <Send className="h-4 w-4" /> Release offer
          </DropdownMenuItem>
        ) : null}
        {["Accepted", "Released"].includes(status) ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Onboard ${row.candidateName ?? row.candidateId}`,
                description: "Creates the employee record, salary structure, leave balances and compliance documents.",
                action: "onboarding.complete",
                submitLabel: "Complete onboarding",
                fields: [
                  { name: "offerId", label: "Offer", type: "text", value: row.id },
                  {
                    name: "joiningDate",
                    label: "Joining date",
                    type: "date",
                    value: new Date().toISOString().slice(0, 10),
                  },
                ],
              })
            }
          >
            <UserPlus className="h-4 w-4" /> Complete onboarding
          </DropdownMenuItem>
        ) : null}
        {status === "Accepted" ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: "Finalise this offer",
                description: "Marks the offer accepted and locks the joining date.",
                action: "offer.release",
                submitLabel: "Mark accepted",
                fields: [
                  { name: "id", label: "Offer", type: "text", value: row.id },
                  { name: "accept", label: "Confirm", type: "text", value: "Accepted" },
                ],
              })
            }
          >
            <FileCheck2 className="h-4 w-4" /> Mark accepted
          </DropdownMenuItem>
        ) : null}
      </>
    );
  },

  deployments: (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    const next = nextOf(DEPLOYMENT_STATUSES, status);
    return (
      <>
        {next ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Set ${row.deploymentCode ?? row.id} to ${next}`,
                description: "Ending a deployment early also cancels its future shifts.",
                action: "deployment.status",
                submitLabel: `Set ${next}`,
                fields: [
                  { name: "id", label: "Deployment", type: "text", value: row.id },
                  { name: "status", label: "Status", type: "select", options: DEPLOYMENT_STATUSES, value: next },
                  { name: "notes", label: "Notes", type: "textarea" },
                ],
              })
            }
          >
            <ArrowRightCircle className="h-4 w-4" /> Set {next}
          </DropdownMenuItem>
        ) : null}
        {row.replacementStatus === "Not Required" || row.replacementStatus === "Replaced" ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Request a replacement for ${row.deploymentCode ?? row.id}`,
                description: "Opens a linked service request against the hospital and notifies the client team.",
                action: "deployment.replace",
                submitLabel: "Request replacement",
                fields: [
                  { name: "id", label: "Deployment", type: "text", value: row.id },
                  {
                    name: "priority",
                    label: "Priority",
                    type: "select",
                    options: ["Low", "Medium", "High", "Critical"],
                    value: "High",
                  },
                  { name: "reason", label: "Reason", type: "textarea", required: true },
                ],
              })
            }
          >
            <RefreshCcw className="h-4 w-4" /> Request replacement
          </DropdownMenuItem>
        ) : null}
      </>
    );
  },

  "service-requests": (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    const next = nextOf(SERVICE_REQUEST_STATUSES, status);
    return (
      <>
        {next ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Move ${row.requestNo ?? row.id} to ${next}`,
                description: String(row.subject ?? ""),
                action: "service-request.update",
                submitLabel: `Move to ${next}`,
                fields: [
                  { name: "id", label: "Request", type: "text", value: row.id },
                  { name: "status", label: "Status", type: "select", options: SERVICE_REQUEST_STATUSES, value: next },
                  { name: "resolutionNote", label: "Resolution note", type: "textarea" },
                ],
              })
            }
          >
            <ArrowRightCircle className="h-4 w-4" /> Move to {next}
          </DropdownMenuItem>
        ) : null}
        {["Open", "Acknowledged"].includes(status) ? (
          <DropdownMenuItem
            onSelect={() =>
              run({ __action: "service-request.update", id: row.id, status: "Closed", resolutionNote: "Closed without action." }, "Request closed.").catch(
                () => undefined
              )
            }
          >
            <Ban className="h-4 w-4" /> Close request
          </DropdownMenuItem>
        ) : null}
      </>
    );
  },

  invoices: (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    const next = nextOf(INVOICE_STATUSES, status);
    return (
      <>
        {next ? (
          <DropdownMenuItem
            onSelect={() =>
              run(
                { __action: "invoice.advance", id: row.id, status: next },
                `${row.invoiceNo ?? row.id} moved to ${next}.`
              ).catch(() => undefined)
            }
          >
            <Send className="h-4 w-4" /> Advance to {next}
          </DropdownMenuItem>
        ) : null}
        {status === "Pending Approval" ? (
          <DropdownMenuItem
            onSelect={() =>
              run({ __action: "invoice.approve", id: row.id }, `${row.invoiceNo ?? row.id} approved.`).catch(() => undefined)
            }
          >
            <CheckCheck className="h-4 w-4" /> Approve invoice
          </DropdownMenuItem>
        ) : null}
        {Number(row.outstanding ?? 0) > 0 ? (
          <DropdownMenuItem
            onSelect={() =>
              prompt({
                title: `Record a payment against ${row.invoiceNo ?? row.id}`,
                description: `Outstanding balance ${Number(row.outstanding).toLocaleString("en-IN")}. Over-payment is refused by the server.`,
                action: "payment.record",
                submitLabel: "Record payment",
                fields: [
                  { name: "invoiceId", label: "Invoice", type: "text", value: row.id },
                  { name: "amount", label: "Amount received", type: "text", required: true, value: String(row.outstanding ?? "") },
                  {
                    name: "method",
                    label: "Method",
                    type: "select",
                    options: ["NEFT/RTGS", "UPI", "Cheque", "Cash", "Card"],
                    value: "NEFT/RTGS",
                  },
                  { name: "reference", label: "Reference", type: "text" },
                ],
              })
            }
          >
            <Wallet className="h-4 w-4" /> Record payment
          </DropdownMenuItem>
        ) : null}
      </>
    );
  },

  expenses: (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    if (!["Submitted", "Under Review"].includes(status)) return null;
    return (
      <>
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: `Approve expense ${row.id}`,
              description: `${row.category} · ${row.amount}`,
              action: "expense.decide",
              submitLabel: "Approve expense",
              fields: [
                { name: "id", label: "Expense", type: "text", value: row.id },
                { name: "action", label: "Decision", type: "select", options: ["Approved", "Rejected", "Reimbursed"], value: "Approved" },
                { name: "note", label: "Note", type: "textarea" },
              ],
            })
          }
        >
          <CheckCheck className="h-4 w-4" /> Approve
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: `Reject expense ${row.id}`,
              description: "The submitter sees the rejection reason against the record.",
              action: "expense.decide",
              submitLabel: "Reject expense",
              fields: [
                { name: "id", label: "Expense", type: "text", value: row.id },
                { name: "action", label: "Decision", type: "text", value: "Rejected" },
                { name: "note", label: "Reason", type: "textarea", required: true, value: "Missing receipt or exceeds policy limit." },
              ],
            })
          }
        >
          <Undo2 className="h-4 w-4" /> Reject
        </DropdownMenuItem>
      </>
    );
  },

  purchaseOrders: (row, ctx, run, prompt) => {
    const status = String(row.status ?? "");
    if (status !== "Pending Approval") return null;
    return (
      <>
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: `Approve ${row.poNo ?? row.id}`,
              description: `${row.vendor} · ${row.totalAmount}`,
              action: "po.decide",
              submitLabel: "Approve order",
              fields: [
                { name: "id", label: "Purchase order", type: "text", value: row.id },
                { name: "status", label: "Status", type: "select", options: ["Approved", "Rejected", "Cancelled"], value: "Approved" },
              ],
            })
          }
        >
          <CheckCheck className="h-4 w-4" /> Approve
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run({ __action: "po.decide", id: row.id, status: "Rejected" }, `${row.poNo ?? row.id} rejected.`).catch(() => undefined)
          }
        >
          <Undo2 className="h-4 w-4" /> Reject
        </DropdownMenuItem>
      </>
    );
  },

  leaveRequests: (row, ctx, run, prompt) =>
    row.status === "Pending" ? (
      <>
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: "Approve this leave request",
              description: `${row.type} · ${row.days} day(s) from ${row.fromDate} to ${row.toDate}.`,
              action: "leave.decide",
              submitLabel: "Approve leave",
              fields: [
                { name: "id", label: "Leave request", type: "text", value: row.id },
                { name: "decision", label: "Decision", type: "select", options: ["Approved", "Rejected"], value: "Approved" },
                { name: "note", label: "Note", type: "textarea" },
              ],
            })
          }
        >
          <CheckCheck className="h-4 w-4" /> Approve
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            prompt({
              title: "Reject this leave request",
              description: "The employee sees the decision note on their portal.",
              action: "leave.decide",
              submitLabel: "Reject leave",
              fields: [
                { name: "id", label: "Leave request", type: "text", value: row.id },
                { name: "decision", label: "Decision", type: "text", value: "Rejected" },
                { name: "note", label: "Reason", type: "textarea", required: true, value: "Insufficient balance / roster coverage." },
              ],
            })
          }
        >
          <Undo2 className="h-4 w-4" /> Reject
        </DropdownMenuItem>
      </>
    ) : null,

  attendance: (row, ctx, run, prompt) =>
    row.correctionRequested ? (
      <DropdownMenuItem
        onSelect={() =>
          prompt({
            title: `Decide the correction for ${row.date}`,
            description: String(row.correctionReason ?? "Correction requested."),
            action: "attendance.approve",
            submitLabel: "Save decision",
            fields: [
              { name: "ids", label: "Record", type: "text", value: row.id },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: ["Present", "Absent", "Half Day", "On Leave", "Week Off", "Holiday"],
                value: String(row.status ?? "Present"),
              },
            ],
          })
        }
      >
        <ShieldAlert className="h-4 w-4" /> Decide correction
      </DropdownMenuItem>
    ) : null,

  shifts: (row, ctx, run, prompt) =>
    row.status === "Scheduled" ? (
      <DropdownMenuItem
        onSelect={() =>
          prompt({
            title: `Mark the shift on ${row.date} as completed`,
            description: "Completed shifts feed worked hours, overtime and hospital billing.",
            action: "shift.swap-decide",
            submitLabel: "Update shift",
            fields: [
              { name: "id", label: "Shift", type: "text", value: row.id },
              {
                name: "status",
                label: "Status",
                type: "select",
                options: ["Scheduled", "In Progress", "Completed", "Missed", "Cancelled"],
                value: "Completed",
              },
            ],
          })
        }
      >
        <CalendarClock className="h-4 w-4" /> Mark completed
      </DropdownMenuItem>
    ) : null,
};

/** Convenience export so pages can render a section heading above the menu. */
export function workflowHint(text: string) {
  return <span className={cn("text-[11.5px] text-muted")}>{text}</span>;
}

export { MessageSquarePlus };
