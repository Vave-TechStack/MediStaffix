/**
 * Sidebar navigation definition.
 *
 * Each entry declares the permission required to see it, so a role switch in
 * the demo immediately reshapes the workspace. Portal roles (Hospital Client,
 * Doctor) are additionally filtered to a single-purpose navigation set.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileSignature,
  Files,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Receipt,
  Repeat2,
  ScrollText,
  Settings,
  ShieldCheck,
  Shuffle,
  Siren,
  Target,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import type { Permission } from "./rbac";
import type { Role } from "./types";

export type BadgeKey =
  | "leads"
  | "opportunities"
  | "followUps"
  | "candidates"
  | "requisitions"
  | "deployments"
  | "invoices"
  | "serviceRequests"
  | "approvals";

export interface NavChild {
  title: string;
  href: string;
  permission: Permission;
  icon?: LucideIcon;
  roles?: Role[];
  badgeKey?: BadgeKey;
}

export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  permission: Permission;
  badgeKey?: BadgeKey;
  children?: NavChild[];
}

export const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  {
    title: "CRM",
    icon: Contact,
    permission: "crm:hospitals:view",
    children: [
      { title: "Hospitals", href: "/crm/hospitals", permission: "crm:hospitals:view", icon: Building2 },
      { title: "Leads", href: "/crm/leads", permission: "crm:leads:view", icon: Target, badgeKey: "leads" },
      { title: "Contacts", href: "/crm/contacts", permission: "crm:hospitals:view", icon: Users },
      { title: "Opportunities", href: "/crm/opportunities", permission: "crm:leads:view", icon: Briefcase, badgeKey: "opportunities" },
      { title: "Follow-ups", href: "/crm/follow-ups", permission: "crm:leads:view", icon: CalendarCheck, badgeKey: "followUps" },
      { title: "Contracts", href: "/crm/contracts", permission: "crm:contracts:view", icon: FileSignature },
    ],
  },
  {
    title: "Recruitment",
    icon: UserPlus,
    permission: "recruitment:candidates:view",
    children: [
      { title: "Candidates", href: "/recruitment/candidates", permission: "recruitment:candidates:view", icon: Users, badgeKey: "candidates" },
      { title: "Job Requisitions", href: "/recruitment/requisitions", permission: "recruitment:requisitions:view", icon: ClipboardList, badgeKey: "requisitions" },
      { title: "Applications", href: "/recruitment/applications", permission: "recruitment:candidates:view", icon: ListChecks },
      { title: "Interviews", href: "/recruitment/interviews", permission: "recruitment:interviews:view", icon: CalendarDays },
      { title: "Offers", href: "/recruitment/offers", permission: "recruitment:offers:view", icon: Handshake },
      { title: "Onboarding", href: "/recruitment/onboarding", permission: "recruitment:offers:view", icon: ClipboardCheck },
    ],
  },
  {
    title: "Workforce",
    icon: HeartPulse,
    permission: "workforce:deployments:view",
    children: [
      { title: "Doctor Directory", href: "/workforce/doctor-directory", permission: "workforce:deployments:view", icon: HeartPulse },
      { title: "Employee Management", href: "/workforce/employees", permission: "hrm:employees:view", icon: Users },
      { title: "Deployment", href: "/workforce/deployment", permission: "workforce:deployments:view", icon: Shuffle, badgeKey: "deployments" },
      { title: "Shift Scheduling", href: "/workforce/shifts", permission: "hrm:shifts:view", icon: CalendarDays },
      { title: "Attendance", href: "/workforce/attendance", permission: "hrm:attendance:view", icon: CalendarCheck },
      { title: "Leave Management", href: "/workforce/leave", permission: "hrm:leave:view", icon: ScrollText },
    ],
  },
  {
    title: "Payroll",
    icon: Wallet,
    permission: "payroll:view",
    children: [
      { title: "Salary Processing", href: "/payroll/salary-processing", permission: "payroll:view", icon: Repeat2 },
      { title: "Payslips", href: "/payroll/payslips", permission: "payroll:view", icon: Files },
      { title: "Incentives", href: "/payroll/incentives", permission: "payroll:view", icon: BadgeIndianRupee },
      { title: "Deductions", href: "/payroll/deductions", permission: "payroll:view", icon: ShieldCheck },
      { title: "Payroll History", href: "/payroll/history", permission: "payroll:view", icon: ScrollText },
    ],
  },
  {
    title: "ERP",
    icon: Receipt,
    permission: "erp:invoices:view",
    children: [
      { title: "Invoices", href: "/erp/invoices", permission: "erp:invoices:view", icon: Receipt, badgeKey: "invoices" },
      { title: "Payments", href: "/erp/payments", permission: "erp:payments:view", icon: Wallet },
      { title: "Expenses", href: "/erp/expenses", permission: "erp:expenses:view", icon: ClipboardCheck },
      { title: "Purchase Orders", href: "/erp/purchase-orders", permission: "erp:procurement:manage", icon: ClipboardList },
      { title: "Finance Overview", href: "/erp/finance", permission: "dashboard:view", icon: Activity },
    ],
  },
  {
    title: "Operations",
    icon: Workflow,
    permission: "workforce:deployments:manage",
    children: [
      { title: "Hospital Requirements", href: "/operations/requirements", permission: "crm:hospitals:view", icon: Target },
      { title: "Doctor Allocations", href: "/operations/allocations", permission: "workforce:deployments:manage", icon: Shuffle, badgeKey: "deployments" },
      { title: "Shift Tracking", href: "/operations/shift-tracking", permission: "hrm:shifts:view", icon: CalendarCheck },
      { title: "Replacement Requests", href: "/operations/replacements", permission: "workforce:deployments:manage", icon: Repeat2 },
      { title: "Service Requests", href: "/operations/service-requests", permission: "crm:hospitals:view", icon: Siren, badgeKey: "serviceRequests" },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    permission: "analytics:view",
    children: [
      { title: "Business Reports", href: "/analytics/reports", permission: "analytics:view", icon: BarChart3 },
      { title: "Revenue Reports", href: "/analytics/revenue", permission: "analytics:view", icon: BadgeIndianRupee },
      { title: "Payroll Reports", href: "/analytics/payroll-reports", permission: "analytics:view", icon: Wallet },
      { title: "Recruitment Reports", href: "/analytics/recruitment", permission: "analytics:view", icon: UserCog },
    ],
  },
  { title: "Documents", href: "/documents", icon: Files, permission: "documents:view" },
  { title: "Settings", href: "/settings", icon: Settings, permission: "settings:manage" },
  { title: "User & Role Management", href: "/users", icon: ShieldCheck, permission: "users:manage" },
];

export const PORTAL_NAV: Record<Role, NavItem[]> = {
  "Hospital Client": [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
    { title: "My Requirements", href: "/operations/requirements", icon: Target, permission: "crm:hospitals:view" },
    { title: "Deployed Staff", href: "/workforce/deployment", icon: HeartPulse, permission: "workforce:deployments:view" },
    { title: "Shift Schedule", href: "/workforce/shifts", icon: CalendarDays, permission: "hrm:shifts:view" },
    { title: "My Invoices", href: "/erp/invoices", icon: Receipt, permission: "erp:invoices:view" },
    { title: "Service Requests", href: "/operations/service-requests", icon: Siren, permission: "crm:hospitals:view", badgeKey: "serviceRequests" },
    { title: "Documents", href: "/documents", icon: Files, permission: "documents:view" },
  ],
  Doctor: [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
    { title: "My Profile", href: "/workforce/doctor-directory", icon: HeartPulse, permission: "workforce:deployments:view" },
    { title: "My Deployment", href: "/workforce/deployment", icon: Shuffle, permission: "workforce:deployments:view" },
    { title: "My Shifts", href: "/workforce/shifts", icon: CalendarDays, permission: "hrm:shifts:view" },
    { title: "My Attendance", href: "/workforce/attendance", icon: CalendarCheck, permission: "hrm:attendance:view" },
    { title: "My Leave", href: "/workforce/leave", icon: ScrollText, permission: "hrm:leave:view" },
    { title: "My Payslips", href: "/payroll/payslips", icon: Files, permission: "payroll:view" },
  ],
} as unknown as Record<Role, NavItem[]>;

export const PORTAL_NAV_ROLES: Role[] = ["Hospital Client", "Doctor"];

export function navForRole(role: Role) {
  return PORTAL_NAV_ROLES.includes(role) ? PORTAL_NAV[role] : NAV;
}

export const HELP_LINKS = [
  { title: "Documentation", href: "/settings", icon: Files },
  { title: "Audit log", href: "/settings?tab=audit", icon: ScrollText },
  { title: "Sign out", href: "/api/auth/logout", icon: LogOut },
];
