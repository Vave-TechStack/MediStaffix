/** System workflows: notifications, global search, document templates, demo reset. */

import { resetDb, recordAudit } from "../store";
import { fail, ok, str, type ActionResult } from "./types";
import { getResource, RESOURCES } from "../resources";
import { can } from "../rbac";
import type { Database, Role, User } from "../types";

export function markNotifications(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  if (payload.all) {
    let count = 0;
    for (const n of db.notifications) {
      const visible = n.audience === "All" || (Array.isArray(n.audience) && n.audience.includes(user.role));
      if (visible && !n.readBy.includes(user.id)) {
        n.readBy.push(user.id);
        count += 1;
      }
    }
    return ok(`${count} notification(s) marked as read.`);
  }
  const id = str(payload, "id");
  const n = db.notifications.find((x) => x.id === id);
  if (!n) return fail("Notification was not found.", 404);
  if (!n.readBy.includes(user.id)) n.readBy.push(user.id);
  return ok("Notification marked as read.");
}

export interface SearchHit {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: string;
}

export function globalSearch(db: Database, user: User, rawQuery: string): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const push = (h: SearchHit, permission: Parameters<typeof can>[1]) => {
    if (can(user.role, permission)) hits.push(h);
  };
  const hospitalName = (id?: string) => db.hospitals.find((h) => h.id === id)?.name ?? "";
  const employeeName = (id?: string) => db.employees.find((e) => e.id === id)?.name ?? "";

  for (const h of db.hospitals) {
    if (![h.name, h.city, h.hrManager, h.registrationNo, h.contactPerson].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Hospital", id: h.id, title: h.name, subtitle: `${h.type} · ${h.city}, ${h.state} · ${h.clientStatus}`, href: `/crm/hospitals/${h.id}`, group: "CRM" }, "crm:hospitals:view");
  }
  for (const l of db.leads) {
    if (![l.name, l.organization, l.contactPerson].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Lead", id: l.id, title: l.name, subtitle: `${l.organization} · ${l.stage}`, href: "/crm/leads", group: "CRM" }, "crm:leads:view");
  }
  for (const c of db.contracts) {
    if (![c.number, c.title].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Contract", id: c.id, title: c.number, subtitle: `${hospitalName(c.hospitalId)} · ends ${c.endDate}`, href: "/crm/contracts", group: "CRM" }, "crm:contracts:view");
  }
  for (const c of db.candidates) {
    if (![c.name, c.specialization, c.qualification, c.candidateCode].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Candidate", id: c.id, title: c.name, subtitle: `${c.specialization} · ${c.stage}`, href: "/recruitment/candidates", group: "Recruitment" }, "recruitment:candidates:view");
  }
  for (const r of db.requisitions) {
    if (![r.jobCode, r.designation, r.specialization].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Requisition", id: r.id, title: `${r.jobCode} — ${r.designation}`, subtitle: `${hospitalName(r.hospitalId)} · ${r.vacancies} opening(s)`, href: "/recruitment/requisitions", group: "Recruitment" }, "recruitment:requisitions:view");
  }
  for (const e of db.employees) {
    if (![e.name, e.employeeCode, e.designation, e.city].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Employee", id: e.id, title: e.name, subtitle: `${e.designation} · ${e.employeeCode}`, href: "/workforce/employees", group: "Workforce" }, "hrm:employees:view");
  }
  for (const d of db.deployments) {
    if (![d.deploymentCode, d.designation, employeeName(d.employeeId), hospitalName(d.hospitalId)].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Deployment", id: d.id, title: d.deploymentCode, subtitle: `${employeeName(d.employeeId)} → ${hospitalName(d.hospitalId)} · ${d.status}`, href: "/workforce/deployment", group: "Operations" }, "workforce:deployments:view");
  }
  for (const i of db.invoices) {
    if (![i.invoiceNo, i.billingPeriod].some((v) => String(v).toLowerCase().includes(q))) continue;
    if (user.role === "Hospital Client" && user.hospitalId && i.hospitalId !== user.hospitalId) continue;
    push({ type: "Invoice", id: i.id, title: i.invoiceNo, subtitle: `${hospitalName(i.hospitalId)} · ${i.status}`, href: "/erp/invoices", group: "Finance" }, "erp:invoices:view");
  }
  for (const d of db.documents) {
    if (![d.name, d.fileName, d.ownerId].some((v) => String(v).toLowerCase().includes(q))) continue;
    push({ type: "Document", id: d.id, title: d.name, subtitle: `${d.category} · ${d.ownerType} ${d.ownerId}`, href: "/documents", group: "Documents" }, "documents:view");
  }
  return hits.slice(0, 40);
}

const TEMPLATES = [
  { key: "offer", label: "Offer Letter", category: "Offer Letter" as const, ownerType: "Candidate" as const },
  { key: "appointment", label: "Appointment Letter", category: "Appointment Letter" as const, ownerType: "Employee" as const },
  { key: "deployment", label: "Deployment Confirmation Letter", category: "Deployment Letter" as const, ownerType: "Deployment" as const },
  { key: "payslip", label: "Salary Slip", category: "Payslip" as const, ownerType: "Employee" as const },
  { key: "proposal", label: "Hospital Proposal", category: "Hospital Contract" as const, ownerType: "Hospital" as const },
  { key: "invoice", label: "Invoice Cover Note", category: "Invoice" as const, ownerType: "Invoice" as const },
];

export function listTemplates() {
  return TEMPLATES.map((t) => ({ key: t.key, label: t.label, category: t.category }));
}

export function renderTemplate(db: Database, user: User, payload: Record<string, unknown>): ActionResult {
  const template = TEMPLATES.find((t) => t.key === str(payload, "template"));
  if (!template) return fail("Unknown document template.");
  const ownerId = str(payload, "ownerId");
  if (!ownerId) return fail("Select the record this document belongs to.", 400, { ownerId: "Required" });

  const exists = (db.documents as { ownerId: string; category: string }[]).some(
    (d) => d.ownerId === ownerId && d.category === template.category
  );
  if (exists && !payload.force) {
    return fail(`A ${template.label} already exists for ${ownerId}. Regenerate with the override option if intended.`, 409);
  }

  const id = `DOC-${Date.now().toString(36).toUpperCase()}`;
  const fileName = `${template.key}_${ownerId}.pdf`;
  db.documents.unshift({
    id,
    name: `${template.label} — ${ownerId}`,
    category: template.category,
    ownerType: template.ownerType,
    ownerId,
    fileName,
    mimeType: "application/pdf",
    sizeKb: 90 + Math.floor(Math.random() * 120),
    uploadedById: user.id,
    uploadedAt: new Date().toISOString(),
    status: "Active",
    accessRoles: ["Super Admin", "Business Admin", "HR Manager"],
    simulated: true,
  });
  recordAudit(db, user, "TEMPLATE_RENDER", "Documents", id, `${user.name} generated a ${template.label} for ${ownerId}.`);
  return ok(`${template.label} generated from the reusable template.`, { documentId: id, fileName });
}

export function resetDemo(db: Database, user: User): ActionResult {
  if (!db.settings.demoMode) return fail("Demo reset is disabled on this deployment.", 403);
  recordAudit(db, user, "DEMO_RESET", "Database", "SYSTEM", `${user.name} reset the demonstration dataset.`);
  void resetDb();
  return ok("Demonstration data has been regenerated from the seeder.");
}

export function resourceCatalogue(user: User) {
  return Object.values(RESOURCES)
    .filter((r) => can(user.role, r.view))
    .map((r) => ({ key: r.key, label: r.labelPlural, permission: r.view }));
}

export { getResource };
export type { Role };
