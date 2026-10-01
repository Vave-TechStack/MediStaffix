import { redirect } from "next/navigation";
import { getDb } from "@/lib/store";
import { getSession, getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { can } from "@/lib/rbac";
import type { NotificationRow } from "@/components/shell/notification-center-types";

export const dynamic = "force-dynamic";

const LABEL_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/crm/hospitals": "Hospitals",
  "/crm/leads": "Lead Pipeline",
  "/crm/contacts": "Hospital Contacts",
  "/crm/opportunities": "Opportunities",
  "/crm/follow-ups": "Follow-ups",
  "/crm/contracts": "Contracts",
  "/recruitment/candidates": "Candidates",
  "/recruitment/requisitions": "Job Requisitions",
  "/recruitment/applications": "Applications",
  "/recruitment/interviews": "Interviews",
  "/recruitment/offers": "Offers",
  "/recruitment/onboarding": "Onboarding",
  "/workforce/doctor-directory": "Doctor Directory",
  "/workforce/employees": "Employee Management",
  "/workforce/deployment": "Doctor Deployment",
  "/workforce/shifts": "Shift Scheduling",
  "/workforce/attendance": "Attendance",
  "/workforce/leave": "Leave Management",
  "/payroll/salary-processing": "Salary Processing",
  "/payroll/payslips": "Payslips",
  "/payroll/incentives": "Incentives",
  "/payroll/deductions": "Deductions",
  "/payroll/history": "Payroll History",
  "/erp/invoices": "Invoices",
  "/erp/payments": "Payments",
  "/erp/expenses": "Expenses",
  "/erp/purchase-orders": "Purchase Orders",
  "/erp/finance": "Finance Overview",
  "/operations/requirements": "Hospital Requirements",
  "/operations/allocations": "Doctor Allocations",
  "/operations/shift-tracking": "Shift Tracking",
  "/operations/replacements": "Replacement Requests",
  "/operations/service-requests": "Service Requests",
  "/analytics/reports": "Business Reports",
  "/analytics/revenue": "Revenue Reports",
  "/analytics/payroll-reports": "Payroll Reports",
  "/analytics/recruitment": "Recruitment Reports",
  "/documents": "Documents",
  "/settings": "Settings",
  "/users": "User & Role Management",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, user, db] = await Promise.all([getSession(), getSessionUser(), getDb()]);
  if (!session || !user) redirect("/login");

  const notifications: NotificationRow[] = db.notifications
    .filter((n) => n.audience === "All" || (Array.isArray(n.audience) && n.audience.includes(user.role)))
    .slice(0, 40)
    .map((n) => ({ ...n, unread: !n.readBy.includes(user.id) }));

  const badges: Record<string, number> = {};
  const now = Date.now();

  if (can(user.role, "crm:leads:view")) {
    badges.leads = db.leads.filter((l) => l.stage !== "Lost" && l.stage !== "Won").length;
    badges.opportunities = db.opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost").length;
    badges.followUps = db.followUps.filter((f) => f.status === "Pending" || f.status === "Overdue").length;
  }
  if (can(user.role, "recruitment:candidates:view")) {
    badges.candidates = db.candidates.filter((c) => c.status === "Active").length;
  }
  if (can(user.role, "recruitment:requisitions:view")) {
    badges.requisitions = db.requisitions.filter((r) => r.status === "Open" || r.status === "Partially Filled").length;
  }
  if (can(user.role, "workforce:deployments:view")) {
    badges.deployments = db.deployments.filter((d) => d.status === "Proposed" || d.status === "Allocated").length;
  }
  if (can(user.role, "erp:invoices:view")) {
    badges.invoices = db.invoices.filter((i) => i.status === "Overdue").length;
  }
  if (can(user.role, "crm:hospitals:view")) {
    const openServiceRequests = db.serviceRequests.filter(
      (s) => !["Resolved", "Rejected", "Closed"].includes(s.status) && (!user.hospitalId || s.hospitalId === user.hospitalId)
    ).length;
    if (openServiceRequests) badges.serviceRequests = openServiceRequests;
  }

  if (can(user.role, "hrm:leave:manage") || can(user.role, "crm:leads:manage")) {
    const pendingLeave = db.leaveRequests.filter((l) => l.status === "Pending").length;
    const pendingExpenses = db.expenses.filter((e) => e.status === "Submitted" || e.status === "Under Review").length;
    const expiringContracts = db.contracts.filter((c) => {
      const days = (new Date(c.endDate).getTime() - now) / 86_400_000;
      return days > 0 && days <= 45;
    }).length;
    const approvals = pendingLeave + pendingExpenses + expiringContracts;
    if (approvals) badges.approvals = approvals;
  }

  const users = db.users
    .filter((u) => u.status === "Active")
    .map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email, avatarColor: u.avatarColor, department: u.department }));

  return (
    <AppShell
      user={user}
      users={users}
      demoMode={db.settings.demoMode}
      notifications={notifications}
      badges={badges}
      labelMap={LABEL_MAP}
    >
      {children}
    </AppShell>
  );
}
