/**
 * Role-based access control.
 *
 * Permissions are enforced in two places:
 *  1. `src/app/api/**` — every route handler calls `requirePermission()`, so a
 *     request is rejected server-side even if a client forges a call.
 *  2. `can()` in the UI — the same permission map hides navigation items and
 *     buttons. The UI check is cosmetic; the API check is the real control.
 */

import type { Role } from "./types";

export const PERMISSIONS = [
  "dashboard:view",
  "crm:hospitals:view",
  "crm:hospitals:manage",
  "crm:leads:view",
  "crm:leads:manage",
  "crm:contracts:view",
  "crm:contracts:manage",
  "recruitment:candidates:view",
  "recruitment:candidates:manage",
  "recruitment:requisitions:view",
  "recruitment:requisitions:manage",
  "recruitment:interviews:view",
  "recruitment:interviews:manage",
  "recruitment:offers:view",
  "recruitment:offers:manage",
  "hrm:employees:view",
  "hrm:employees:manage",
  "hrm:attendance:view",
  "hrm:attendance:manage",
  "hrm:leave:view",
  "hrm:leave:manage",
  "hrm:shifts:view",
  "hrm:shifts:manage",
  "workforce:deployments:view",
  "workforce:deployments:manage",
  "payroll:view",
  "payroll:process",
  "payroll:approve",
  "erp:invoices:view",
  "erp:invoices:manage",
  "erp:invoices:approve",
  "erp:payments:view",
  "erp:payments:manage",
  "erp:expenses:view",
  "erp:expenses:manage",
  "erp:expenses:approve",
  "erp:procurement:manage",
  "analytics:view",
  "documents:view",
  "documents:manage",
  "settings:manage",
  "users:manage",
  "audit:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  "Super Admin": ALL,
  "Business Admin": [
    "dashboard:view",
    "crm:hospitals:view", "crm:hospitals:manage",
    "crm:leads:view", "crm:leads:manage",
    "crm:contracts:view", "crm:contracts:manage",
    "recruitment:requisitions:view", "recruitment:requisitions:manage",
    "recruitment:candidates:view",
    "workforce:deployments:view", "workforce:deployments:manage",
    "hrm:shifts:view",
    "payroll:view",
    "erp:invoices:view", "erp:invoices:approve",
    "erp:payments:view",
    "erp:expenses:view", "erp:expenses:approve",
    "erp:procurement:manage",
    "analytics:view",
    "documents:view", "documents:manage",
    "hrm:leave:view", "hrm:leave:manage",
    "audit:view",
  ],
  "HR Manager": [
    "dashboard:view",
    "recruitment:candidates:view", "recruitment:candidates:manage",
    "recruitment:requisitions:view", "recruitment:requisitions:manage",
    "recruitment:interviews:view", "recruitment:interviews:manage",
    "recruitment:offers:view", "recruitment:offers:manage",
    "hrm:employees:view", "hrm:employees:manage",
    "hrm:attendance:view", "hrm:attendance:manage",
    "hrm:leave:view", "hrm:leave:manage",
    "hrm:shifts:view", "hrm:shifts:manage",
    "workforce:deployments:view",
    "crm:hospitals:view",
    "documents:view", "documents:manage",
    "analytics:view",
  ],
  Recruiter: [
    "dashboard:view",
    "recruitment:candidates:view", "recruitment:candidates:manage",
    "recruitment:requisitions:view", "recruitment:requisitions:manage",
    "recruitment:interviews:view", "recruitment:interviews:manage",
    "recruitment:offers:view", "recruitment:offers:manage",
    "documents:view", "documents:manage",
  ],
  "Payroll Manager": [
    "dashboard:view",
    "payroll:view", "payroll:process", "payroll:approve",
    "hrm:employees:view",
    "workforce:deployments:view",
    "erp:expenses:view",
    "documents:view", "documents:manage",
    "analytics:view",
  ],
  "Finance Manager": [
    "dashboard:view",
    "erp:invoices:view", "erp:invoices:manage", "erp:invoices:approve",
    "erp:payments:view", "erp:payments:manage",
    "erp:expenses:view", "erp:expenses:manage", "erp:expenses:approve",
    "erp:procurement:manage",
    "crm:hospitals:view", "crm:contracts:view",
    "payroll:view",
    "analytics:view",
    "documents:view", "documents:manage",
    "audit:view",
  ],
  "Operations Manager": [
    "dashboard:view",
    "operations:*" as Permission,
    "workforce:deployments:view", "workforce:deployments:manage",
    "hrm:employees:view",
    "hrm:attendance:view", "hrm:attendance:manage",
    "hrm:leave:view", "hrm:leave:manage",
    "hrm:shifts:view", "hrm:shifts:manage",
    "crm:hospitals:view", "crm:contracts:view",
    "recruitment:requisitions:view", "recruitment:candidates:view",
    "analytics:view",
  ],
  "Hospital Client": [
    "dashboard:view",
    "crm:hospitals:view",
    "hrm:shifts:view",
    "workforce:deployments:view",
    "erp:invoices:view",
    "documents:view",
  ],
  Doctor: [
    "dashboard:view",
    "hrm:attendance:view",
    "hrm:leave:view", "hrm:leave:manage",
    "hrm:shifts:view",
    "payroll:view",
    "documents:view",
    "workforce:deployments:view",
  ],
};

/* Operations Manager needs explicit entries; the wildcard above is not part of
 * the PERMISSIONS union, so list them explicitly instead. */
ROLE_PERMISSIONS["Operations Manager"] = [
  "dashboard:view",
  "workforce:deployments:view", "workforce:deployments:manage",
  "hrm:employees:view",
  "hrm:attendance:view", "hrm:attendance:manage",
  "hrm:leave:view", "hrm:leave:manage",
  "hrm:shifts:view", "hrm:shifts:manage",
  "crm:hospitals:view", "crm:contracts:view",
  "recruitment:requisitions:view", "recruitment:candidates:view",
  "analytics:view",
  "documents:view",
];

export function can(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  "Super Admin": "Unrestricted access to every module, setting, user and audit record.",
  "Business Admin": "CRM, contracts, deployments, finance oversight, approvals and reports.",
  "HR Manager": "Recruitment, employee records, attendance, leave, shifts and rosters.",
  Recruiter: "Candidates, requisitions, interviews, offers and onboarding only.",
  "Payroll Manager": "Salary structures, payroll processing, payslips and payment status.",
  "Finance Manager": "Invoices, payments, expenses, procurement and finance reports.",
  "Operations Manager": "Hospital requirements, doctor allocation, deployment and shifts.",
  "Hospital Client": "Portal access limited to their own staffing strength, rosters and invoices.",
  Doctor: "Self-service access to profile, deployment, shifts, attendance, payslips and leave.",
};
