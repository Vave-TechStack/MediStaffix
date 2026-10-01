/**
 * Finance workflows: invoice generation and approval, simulated receipts,
 * expense approval and purchase-order decisions.
 *
 * Payment recording is deliberately simulated — it writes a receipt row and
 * updates invoice balances, and never contacts a bank or payment gateway.
 */

import { agingBucket, createInvoice, buildBillingPreview, recomputeInvoiceTotals } from "../billing-engine";
import { notify, recordActivity, recordAudit } from "../store";
import { fail, ok, str, type ActionResult } from "./types";
import type { Database, User } from "../types";

export function previewInvoice(db: Database, _user: User, payload: Record<string, unknown>): ActionResult {
  const preview = buildBillingPreview(db, str(payload, "hospitalId"), str(payload, "period"));
  if ("error" in preview) return fail(preview.error, 400);
  return ok("Billing preview computed.", preview as unknown as Record<string, unknown>);
}

export function generateInvoice(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const hospitalId = str(payload, "hospitalId");
  const period = str(payload, "period") || new Date().toISOString().slice(0, 7);
  const result = createInvoice(db, hospitalId, period, user);
  if ("error" in result) return fail(result.error, 409);
  const invoice = result.invoice;
  recordActivity(db, {
    entity: "Invoice",
    entityId: invoice.id,
    hospitalId,
    type: "Invoice Generated",
    summary: `Invoice ${invoice.invoiceNo} generated for ${period} with ${invoice.items.length} line item(s).`,
    actorId: user.id,
  });
  recordAudit(db, user, "INVOICE_GENERATE", "Invoices", invoice.id, `${user.name} generated ${invoice.invoiceNo} for ${period}.`);
  return ok(`Invoice ${invoice.invoiceNo} generated as a draft.`, { invoice });
}

export function advanceInvoice(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const invoice = db.invoices.find((i) => i.id === str(payload, "id"));
  if (!invoice) return fail("Invoice was not found.", 404);
  const target = str(payload, "status");
  const allowed: Record<string, string[]> = {
    "Pending Approval": ["Draft"],
    Sent: ["Pending Approval"],
    Cancelled: ["Draft", "Pending Approval", "Sent", "Overdue"],
  };
  if (!allowed[target]) return fail(`"${target}" is not a valid invoice transition.`);

  const previous = invoice.status;
  if (target === "Cancelled") {
    if (invoice.amountPaid > 0) return fail("An invoice with recorded payments cannot be cancelled. Raise a credit note instead.");
    invoice.status = "Cancelled";
  } else {
    if (!allowed[target].includes(previous)) {
      return fail(`An invoice in "${previous}" cannot move to "${target}".`);
    }
    invoice.status = target as typeof invoice.status;
    if (target === "Pending Approval") {
      recomputeInvoiceTotals(invoice);
    }
    if (target === "Sent") {
      invoice.sentAt = new Date().toISOString();
      invoice.approvedById = invoice.approvedById ?? user.id;
      invoice.approvedAt = invoice.approvedAt ?? new Date().toISOString();
      notify(db, {
        title: "Invoice sent",
        body: `${invoice.invoiceNo} marked as sent to ${db.hospitals.find((h) => h.id === invoice.hospitalId)?.name}.`,
        type: "Payment",
        severity: "Info",
        link: "/erp/invoices",
        audience: ["Super Admin", "Finance Manager", "Business Admin"],
      });
    }
  }

  recordActivity(db, {
    entity: "Invoice",
    entityId: invoice.id,
    hospitalId: invoice.hospitalId,
    type: "Invoice Status Changed",
    summary: `${invoice.invoiceNo} moved from ${previous} to ${target}.`,
    actorId: user.id,
  });
  recordAudit(db, user, "INVOICE_STATUS", "Invoices", invoice.id, `${user.name} moved ${invoice.invoiceNo} from ${previous} to ${target}.`, { status: previous }, { status: target });
  return ok(`${invoice.invoiceNo} is now ${target}.`);
}

export function approveInvoice(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const invoice = db.invoices.find((i) => i.id === str(payload, "id"));
  if (!invoice) return fail("Invoice was not found.", 404);
  if (invoice.status === "Paid") return fail("This invoice is already settled.");
  invoice.approvedById = user.id;
  invoice.approvedAt = new Date().toISOString();
  if (invoice.status === "Draft" || invoice.status === "Pending Approval") invoice.status = "Sent";
  invoice.sentAt = invoice.sentAt ?? new Date().toISOString();
  recomputeInvoiceTotals(invoice);
  recordAudit(db, user, "INVOICE_APPROVE", "Invoices", invoice.id, `${user.name} approved and released ${invoice.invoiceNo}.`);
  return ok(`${invoice.invoiceNo} approved and released to the client.`);
}

export function recordPayment(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const invoice = db.invoices.find((i) => i.id === str(payload, "invoiceId"));
  if (!invoice) return fail("Invoice was not found.", 404);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a positive receipt amount.", 422, { amount: "Enter a positive amount." });
  if (amount > invoice.outstanding) {
    return fail(
      `The outstanding balance on ${invoice.invoiceNo} is ₹${invoice.outstanding.toLocaleString("en-IN")}. Entered amount exceeds it.`,
      422,
      { amount: "Exceeds outstanding balance." }
    );
  }
  if (invoice.status === "Draft") return fail("Approve and release the invoice before recording a receipt.", 409);
  if (invoice.status === "Cancelled") return fail("Receipts cannot be recorded against a cancelled invoice.", 409);

  const seq = db.payments.length + 1;
  db.payments.unshift({
    id: `PAY-${String(seq).padStart(5, "0")}`,
    paymentNo: `RCPT-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`,
    invoiceId: invoice.id,
    hospitalId: invoice.hospitalId,
    amount,
    method: (str(payload, "method") || "NEFT/RTGS") as never,
    reference: str(payload, "reference") || `TXN${Date.now().toString().slice(-9)}`,
    receivedOn: str(payload, "receivedOn") || new Date().toISOString().slice(0, 10),
    recordedById: user.id,
    simulated: true,
    notes: str(payload, "notes") || "Simulated receipt. No bank transfer was initiated by this system.",
  });

  invoice.amountPaid = Math.round((invoice.amountPaid + amount) * 100) / 100;
  invoice.outstanding = Math.max(0, Math.round((invoice.totalAmount - invoice.amountPaid) * 100) / 100);
  invoice.status = invoice.outstanding <= 0 ? "Paid" : "Partially Paid";

  recordActivity(db, {
    entity: "Invoice",
    entityId: invoice.id,
    hospitalId: invoice.hospitalId,
    type: "Payment Recorded",
    summary: `Receipt of ₹${amount.toLocaleString("en-IN")} recorded against ${invoice.invoiceNo}. ${invoice.outstanding > 0 ? `Balance ₹${invoice.outstanding.toLocaleString("en-IN")} is ${agingBucket(invoice.dueDate)} overdue.` : "Invoice fully settled."}`,
    actorId: user.id,
  });
  recordAudit(db, user, "PAYMENT_RECORD", "Payments", invoice.id, `${user.name} recorded a simulated receipt of ₹${amount} against ${invoice.invoiceNo}.`);
  return ok(
    invoice.outstanding > 0
      ? `Receipt recorded. ${invoice.invoiceNo} is now partially paid with ₹${invoice.outstanding.toLocaleString("en-IN")} outstanding.`
      : `Receipt recorded. ${invoice.invoiceNo} is fully settled.`
  );
}

export function decideExpense(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const expense = db.expenses.find((e) => e.id === str(payload, "id"));
  if (!expense) return fail("Expense was not found.", 404);
  if (["Approved", "Rejected", "Reimbursed"].includes(expense.status)) {
    return fail(`This expense is already ${expense.status.toLowerCase()}.`);
  }
  const action = str(payload, "action") === "Rejected" ? "Rejected" : str(payload, "action") === "Reimbursed" ? "Reimbursed" : "Approved";
  expense.status = action;
  expense.approvals.push({
    id: `EXA-${Date.now().toString(36).toUpperCase()}`,
    expenseId: expense.id,
    approverId: user.id,
    action,
    note: str(payload, "note") || (action === "Approved" ? "Approved after policy check." : action === "Rejected" ? "Rejected by approver." : "Reimbursement recorded."),
    at: new Date().toISOString(),
  });
  recordAudit(db, user, "EXPENSE_DECISION", "Expenses", expense.id, `${user.name} marked expense ${expense.expenseNo} as ${action}.`);
  return ok(`Expense ${expense.expenseNo} ${action.toLowerCase()}.`);
}

export function decidePurchaseOrder(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const po = db.purchaseOrders.find((p) => p.id === str(payload, "id"));
  if (!po) return fail("Purchase order was not found.", 404);
  if (po.status === "Received") return fail("This purchase order is already fully received.");
  const target = str(payload, "status");
  if (!["Pending Approval", "Approved", "Partially Received", "Received", "Cancelled"].includes(target)) {
    return fail(`"${target}" is not a valid purchase order status.`);
  }
  const previous = po.status;
  po.status = target as typeof po.status;
  recordAudit(db, user, "PO_STATUS", "Purchase Orders", po.id, `${user.name} moved ${po.poNo} from ${previous} to ${target}.`);
  return ok(`${po.poNo} is now ${target}.`);
}
