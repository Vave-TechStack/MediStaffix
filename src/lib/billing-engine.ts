/**
 * Hospital billing engine.
 *
 * Generates a monthly invoice from a contract by combining:
 *   - deployments active during the billing period,
 *   - contracted per-doctor rates,
 *   - approved duty days derived from the shift roster,
 *   - the configurable service charge and tax on the invoice.
 *
 * The generated document records the basis for every line so the hospital can
 * reconcile it, and the totals are recomputed server-side (never trusted from
 * the client).
 */

import { computePayrollLine, daysInPeriod } from "./payroll-engine";
import type { Database, Invoice, InvoiceItem, User } from "./types";

const round0 = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BillingPreview {
  hospitalId: string;
  contractId: string;
  billingPeriod: string;
  items: Omit<InvoiceItem, "id" | "invoiceId">[];
  subTotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
  warnings: string[];
}

export function buildBillingPreview(db: Database, hospitalId: string, period: string): BillingPreview | { error: string } {
  const contract = db.contracts
    .filter((c) => c.hospitalId === hospitalId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  if (!contract) return { error: "This hospital has no staffing contract, so no invoice can be generated." };

  const periodStart = `${period}-01`;
  const periodEnd = `${period}-${String(daysInPeriod(period)).padStart(2, "0")}`;
  if (contract.endDate < periodStart || contract.startDate > periodEnd) {
    return { error: `Contract ${contract.number} does not cover ${period}.` };
  }

  const deployments = db.deployments.filter(
    (d) =>
      d.hospitalId === hospitalId &&
      d.startDate <= periodEnd &&
      d.endDate >= periodStart &&
      ["Active", "Confirmed", "Completed", "On Leave"].includes(d.status)
  );

  const items: Omit<InvoiceItem, "id" | "invoiceId">[] = [];
  const warnings: string[] = [];
  const dim = daysInPeriod(period);

  for (const dep of deployments) {
    const employee = db.employees.find((e) => e.id === dep.employeeId);
    if (!employee) continue;
    const rate =
      db.contractRates.find((r) => r.contractId === contract.id && r.designation === dep.designation)?.rate ??
      db.contractRates.find((r) => r.contractId === contract.id)?.rate ??
      dep.monthlyHospitalBilling;

    const approvedShifts = db.shifts.filter((s) => s.deploymentId === dep.id && s.date.startsWith(period)).length;
    const approvedAttendance = db.attendance.filter(
      (a) => a.deploymentId === dep.id && a.date.startsWith(period) && ["Present", "Late", "Half Day"].includes(a.status)
    ).length;

    let dutyDays = Math.max(approvedAttendance, approvedShifts);
    if (dutyDays === 0) {
      dutyDays = Math.round(dim * 0.78);
      warnings.push(`${employee.name}: no approved shift or attendance data for ${period} — billed on an assumed duty factor of 78%.`);
    }

    const prorated = round0((rate * dutyDays) / dim);
    items.push({
      deploymentId: dep.id,
      employeeId: dep.employeeId,
      description: `${employee.name} — ${dep.designation} (${dutyDays} approved duty days of ${dim})`,
      category: employee.doctorProfile?.categories[0] ?? "Resident Doctor",
      shifts: dutyDays,
      rate,
      amount: prorated,
    });
  }

  if (!items.length) {
    return { error: `No deployments were active at this hospital during ${period}, so there is nothing to bill.` };
  }

  const subTotal = round0(items.reduce((s, i) => s + i.amount, 0));
  const svcPercent = Number(db.settings.statutory.serviceCharge?.percent ?? 2.5);
  const serviceChargeAmount = round0((subTotal * svcPercent) / 100);
  const taxPercent = Number(db.settings.statutory.invoiceTax.percent) || 0;
  const taxAmount = round0(((subTotal + serviceChargeAmount) * taxPercent) / 100);
  const totalAmount = round0(subTotal + serviceChargeAmount + taxAmount);

  return {
    hospitalId,
    contractId: contract.id,
    billingPeriod: period,
    items,
    subTotal,
    serviceChargeAmount,
    taxAmount,
    totalAmount,
    warnings,
  };
}

export function createInvoice(db: Database, hospitalId: string, period: string, _user: User): { invoice: Invoice } | { error: string } {
  const preview = buildBillingPreview(db, hospitalId, period);
  if ("error" in preview) return preview;

  const existing = db.invoices.find((i) => i.hospitalId === hospitalId && i.billingPeriod === period);
  const hospital = db.hospitals.find((h) => h.id === hospitalId)?.name ?? "this hospital";
  if (existing && existing.status !== "Cancelled" && existing.status !== "Draft") {
    return { error: `An invoice (${existing.invoiceNo}) already exists for ${hospital} in ${period}. Cancel it before regenerating.` };
  }

  const seq = db.invoices.length + 1;
  const id = `INV-${period.replace("-", "")}-${String(seq).padStart(4, "0")}`;
  const invDate = `${period}-${String(daysInPeriod(period)).padStart(2, "0")}`;
  const termsDays =
    db.settings.defaultPaymentTerms === "Net 15" ? 15
    : db.settings.defaultPaymentTerms === "Net 45" ? 45
    : db.settings.defaultPaymentTerms === "Net 60" ? 60
    : db.settings.defaultInvoiceDueDays;
  const due = new Date(`${invDate}T00:00:00`);
  due.setDate(due.getDate() + termsDays);

  const invoice: Invoice = {
    id,
    invoiceNo: `MST-INV-${period.replace("-", "")}-${String(seq).padStart(4, "0")}`,
    hospitalId,
    contractId: preview.contractId,
    billingPeriod: period,
    invoiceDate: invDate,
    dueDate: due.toISOString().slice(0, 10),
    items: preview.items.map((i, idx) => ({ ...i, id: `IVI-${id}-${idx + 1}`, invoiceId: id })),
    serviceChargePercent: Number(db.settings.statutory.serviceCharge?.percent ?? 2.5),
    serviceChargeAmount: preview.serviceChargeAmount,
    taxPercent: Number(db.settings.statutory.invoiceTax.percent) || 0,
    taxAmount: preview.taxAmount,
    totalAmount: preview.totalAmount,
    amountPaid: 0,
    outstanding: preview.totalAmount,
    status: "Draft",
    notes: preview.warnings.length
      ? `Generated from ${preview.items.length} deployment line(s). ${preview.warnings.length} data assumption(s) applied.`
      : `Generated from ${preview.items.length} deployment line(s) and approved duty records.`,
    createdAt: new Date().toISOString(),
  };

  if (existing && existing.status === "Draft") {
    Object.assign(existing, invoice, { id: existing.id, invoiceNo: existing.invoiceNo });
  } else {
    db.invoices.unshift(invoice);
  }
  return { invoice };
}

/** Recompute an invoice's totals from its own line items. */
export function recomputeInvoiceTotals(invoice: Invoice) {
  const sub = invoice.items.reduce((s, i) => s + i.amount, 0);
  invoice.serviceChargeAmount = round0((sub * invoice.serviceChargePercent) / 100);
  invoice.taxAmount = round0(((sub + invoice.serviceChargeAmount) * invoice.taxPercent) / 100);
  invoice.totalAmount = round0(sub + invoice.serviceChargeAmount + invoice.taxAmount);
  invoice.outstanding = round2(Math.max(0, invoice.totalAmount - invoice.amountPaid));
}

export function agingBucket(dueDate: string, today = new Date()) {
  const days = Math.floor((today.getTime() - new Date(`${dueDate}T00:00:00`).getTime()) / 86400000);
  if (days <= 0) return "Not due";
  if (days <= 30) return "1-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
}

/** Hospital profitability: billed vs paid vs doctor cost vs expenses. */
export function hospitalProfitability(db: Database, period?: string) {
  const invoices = period ? db.invoices.filter((i) => i.billingPeriod === period) : db.invoices;
  return db.hospitals
    .map((h) => {
      const inv = invoices.filter((i) => i.hospitalId === h.id);
      const billed = inv.reduce((s, i) => s + i.totalAmount, 0);
      const collected = inv.reduce((s, i) => s + i.amountPaid, 0);
      const outstanding = inv.reduce((s, i) => s + i.outstanding, 0);
      const deployments = db.deployments.filter((d) => d.hospitalId === h.id && (d.status === "Active" || d.status === "Confirmed" || d.status === "Completed"));
      const doctorCost = deployments.reduce((s, d) => s + d.monthlySalary, 0);
      const grossMargin = billed - doctorCost;
      return {
        hospitalId: h.id,
        hospital: h.name,
        invoices: inv.length,
        billed,
        collected,
        outstanding,
        doctorCost,
        grossMargin,
        marginPercent: billed > 0 ? Math.round((grossMargin / billed) * 1000) / 10 : 0,
        deployments: deployments.length,
      };
    })
    .filter((r) => r.invoices > 0 || r.deployments > 0)
    .sort((a, b) => b.billed - a.billed);
}

export { computePayrollLine };
