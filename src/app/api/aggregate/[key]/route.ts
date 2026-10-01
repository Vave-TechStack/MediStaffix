/**
 * Aggregated read models for the dashboard and analytics modules.
 *
 * Each key returns a fully derived payload computed from live records, so the
 * charts, KPI cards and report tables all move when a record is created,
 * approved or finalised. No figure is hard-coded.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDb } from "@/lib/store";
import { agingBucket, hospitalProfitability } from "@/lib/billing-engine";
import { periodStats } from "@/lib/payroll-engine";
import type { Database, Role, User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roundMoney = (n: number) => Math.round(n);

const last12 = (db: Database) => {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  void db;
  return out;
};

function scopeHospitals(db: Database, user: User) {
  if (user.role === "Hospital Client" && user.hospitalId) return db.hospitals.filter((h) => h.id === user.hospitalId);
  return db.hospitals;
}

function buildDoctorDashboard(db: Database, user: User) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const emp = db.employees.find((e) => e.id === user.employeeId);
  const myDeployments = db.deployments.filter((d) => d.employeeId === user.employeeId);
  const active = myDeployments.find((d) => d.status === "Active" || d.status === "Confirmed");
  const myShifts = db.shifts.filter((s) => s.employeeId === user.employeeId && s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const myAttendance = db.attendance.filter((a) => a.employeeId === user.employeeId && a.date.startsWith(period));
  const stats = periodStats(db, user.employeeId ?? "", period);
  const payslips = db.payslips.filter((p) => p.employeeId === user.employeeId).sort((a, b) => b.period.localeCompare(a.period));
  const leaves = db.leaveRequests.filter((l) => l.employeeId === user.employeeId);
  const balance = db.leaveBalances.find((b) => b.employeeId === user.employeeId);
  const nextPayslip = payslips[0];
  const nextPayslipItem = db.payrollItems.find((i) => i.id === nextPayslip?.itemId);

  return {
    kpis: [
      { key: "present", label: `Present Days · ${period}`, value: stats.presentDays, sub: `${stats.absentDays} absence(s), ${stats.overtimeHours} OT hours`, tone: "success" },
      { key: "shifts", label: "Upcoming Shifts", value: myShifts.length, sub: myShifts[0] ? `Next on ${myShifts[0].date}` : "No roster published", tone: "info" },
      { key: "deployment", label: "Active Deployment", value: active ? "1" : "0", sub: active ? `${active.designation} · ${db.hospitals.find((h) => h.id === active.hospitalId)?.name}` : "Not currently deployed", tone: "brand" },
      { key: "net", label: "Last Net Salary", value: nextPayslip?.netSalary ?? 0, money: true, sub: nextPayslip ? `Payslip for ${nextPayslip.period}` : "No payslip generated yet", tone: "brand" },
      { key: "ot", label: "Overtime This Month", value: stats.overtimeHours, sub: `${myAttendance.filter((a) => a.overtimeHours > 0).length} day(s) with overtime`, tone: "warning" },
      { key: "leave", label: "Leave Balance", value: balance ? balance.casual + balance.sick + balance.earned : 0, sub: balance ? `${balance.casual} casual · ${balance.sick} sick · ${balance.earned} earned` : "No balance configured", tone: "info" },
    ],
    charts: {
      attendance: last12(db).map((m) => {
        const s = periodStats(db, user.employeeId ?? "", m);
        return { label: m, present: s.presentDays, absent: s.absentDays, overtime: s.overtimeHours };
      }),
      earnings: payslips
        .slice(0, 12)
        .reverse()
        .map((p) => ({ label: p.period, net: p.netSalary })),
    },
    widgets: {
      profile: emp
        ? {
            name: emp.name,
            employeeCode: emp.employeeCode,
            designation: emp.designation,
            department: emp.department,
            dateOfJoining: emp.dateOfJoining,
            employmentType: emp.employmentType,
            specialisation: emp.doctorProfile?.specialisation,
            council: emp.doctorProfile?.registrationCouncil,
          }
        : null,
      deployment: active
        ? {
            deploymentCode: active.deploymentCode,
            hospital: db.hospitals.find((h) => h.id === active.hospitalId)?.name,
            designation: active.designation,
            shift: active.shift,
            startDate: active.startDate,
            endDate: active.endDate,
            reportingContact: active.reportingContact,
            reportingContactPhone: active.reportingContactPhone,
          }
        : null,
      deploymentHistory: myDeployments.map((d) => ({
        id: d.id,
        code: d.deploymentCode,
        hospital: db.hospitals.find((h) => h.id === d.hospitalId)?.name,
        designation: d.designation,
        startDate: d.startDate,
        endDate: d.endDate,
        status: d.status,
      })),
      upcomingShifts: myShifts.slice(0, 10).map((s) => ({ ...s, hospital: db.hospitals.find((h) => h.id === s.hospitalId)?.name })),
      recentAttendance: myAttendance.slice(-10).reverse().map((a) => ({ ...a, hospital: db.hospitals.find((h) => h.id === a.hospitalId)?.name })),
      leaveRequests: leaves.slice(0, 8),
      payslips: payslips.slice(0, 8),
      lastPayslipBreakdown: nextPayslipItem ?? null,
      documents: db.documents
        .filter((d) => (d.ownerType === "Employee" && d.ownerId === user.employeeId) || (d.ownerType === "Candidate" && d.ownerId === emp?.doctorProfile?.candidateId))
        .slice(0, 8),
    },
    meta: { period, generatedAt: new Date().toISOString(), isPortal: true, role: user.role },
  };
}

function buildDashboard(db: Database, user: User) {
  if ((user.role as string) === "Doctor") return buildDoctorDashboard(db, user);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hospitals = scopeHospitals(db, user);
  const hospitalIds = new Set(hospitals.map((h) => h.id));
  const isPortal = user.role === "Hospital Client" || user.role === "Doctor";

  const activeDeployments = db.deployments.filter((d) => (d.status === "Active" || d.status === "Confirmed") && hospitalIds.has(d.hospitalId));
  const periodInvoices = db.invoices.filter((i) => i.billingPeriod === period && hospitalIds.has(i.hospitalId));
  const periodPayroll = db.payrollRuns.find((r) => r.period === period);
  const periodPayrollItems = db.payrollItems.filter((i) => i.runId === periodPayroll?.id);

  const revenueInvoiced = periodInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const revenueCollected = db.invoices.filter((i) => i.billingPeriod === period && hospitalIds.has(i.hospitalId)).reduce((s, i) => s + i.amountPaid, 0);
  const payrollCost = periodPayroll?.totalNet ?? periodPayrollItems.reduce((s, i) => s + i.netSalary, 0);
  const outstanding = db.invoices.filter((i) => i.outstanding > 0 && hospitalIds.has(i.hospitalId)).reduce((s, i) => s + i.outstanding, 0);

  const kpis = [
    { key: "hospitals", label: "Total Hospitals", value: hospitals.filter((h) => !h.archived).length, sub: `${hospitals.filter((h) => h.clientStatus === "Active").length} active clients`, tone: "brand" },
    { key: "activeClients", label: "Active Clients", value: hospitals.filter((h) => h.clientStatus === "Active").length, sub: `${hospitals.filter((h) => h.contractStatus === "Expiring Soon").length} contract(s) expiring soon`, tone: "brand" },
    { key: "doctors", label: "Registered Doctors", value: db.employees.filter((e) => e.doctorProfile).length, sub: `${db.employees.filter((e) => e.doctorProfile && e.employmentStatus === "Active").length} currently employed`, tone: "info" },
    { key: "deployed", label: "Active Deployments", value: activeDeployments.length, sub: `${db.deployments.filter((d) => d.status === "Completed").length} completed historically`, tone: "success" },
    { key: "openReqs", label: "Open Requirements", value: db.requirements.filter((r) => r.status === "Open" || r.status === "Partially Allocated").length, sub: `${db.requisitions.filter((j) => j.status === "Open").length} open requisitions`, tone: "warning" },
    { key: "revenue", label: `Revenue Invoiced · ${period}`, value: revenueInvoiced, money: true, sub: `Collected ${revenueCollected.toLocaleString("en-IN")}`, tone: "success" },
    { key: "payroll", label: `Payroll Cost · ${period}`, value: payrollCost, money: true, sub: `${periodPayroll?.totalEmployees ?? 0} employees on the run`, tone: "info" },
    { key: "outstanding", label: "Outstanding Payments", value: outstanding, money: true, sub: `${db.invoices.filter((i) => i.status === "Overdue" && hospitalIds.has(i.hospitalId)).length} invoice(s) overdue`, tone: "danger" },
    {
      key: "margin",
      label: `Gross Margin · ${period}`,
      value: revenueInvoiced - payrollCost,
      money: true,
      sub: revenueInvoiced > 0 ? `${Math.round(((revenueInvoiced - payrollCost) / revenueInvoiced) * 1000) / 10}% of invoiced revenue` : "No invoices raised yet",
      tone: "brand",
    },
    {
      key: "expiring",
      label: "Contract Expirations (45 days)",
      value: db.contracts.filter((c) => {
        const days = Math.floor((new Date(c.endDate).getTime() - now.getTime()) / 86400000);
        return days >= 0 && days <= 45 && hospitalIds.has(c.hospitalId);
      }).length,
      sub: "Renewal action required",
      tone: "warning",
    },
  ];

  const months = last12(db);
  const revenueVsPayroll = months.map((m) => {
    const inv = db.invoices.filter((i) => i.billingPeriod === m && hospitalIds.has(i.hospitalId));
    const run = db.payrollRuns.find((r) => r.period === m);
    return {
      month: m,
      label: m,
      invoiced: inv.reduce((s, i) => s + i.totalAmount, 0),
      collected: inv.reduce((s, i) => s + i.amountPaid, 0),
      payroll: run?.totalNet ?? 0,
      expenses: db.expenses.filter((e) => e.expenseDate.startsWith(m) && ["Approved", "Reimbursed"].includes(e.status)).reduce((s, e) => s + e.amount, 0),
    };
  });

  const deploymentTrend = months.map((m) => {
    const end = `${m}-31`;
    return {
      month: m,
      label: m,
      active: db.deployments.filter((d) => d.startDate <= end && d.endDate >= `${m}-01`).length,
      added: db.deployments.filter((d) => d.startDate.startsWith(m)).length,
      ended: db.deployments.filter((d) => d.endDate.startsWith(m)).length,
    };
  });

  const hospitalRevenue = hospitals
    .map((h) => {
      const inv = db.invoices.filter((i) => i.hospitalId === h.id && i.billingPeriod === period);
      return {
        name: h.name,
        short: h.name.split(" ")[0],
        invoiced: inv.reduce((s, i) => s + i.totalAmount, 0),
        collected: inv.reduce((s, i) => s + i.amountPaid, 0),
        outstanding: inv.reduce((s, i) => s + i.outstanding, 0),
      };
    })
    .sort((a, b) => b.invoiced - a.invoiced)
    .slice(0, 8);

  const funnelStages = ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Interview Completed", "Selected", "Offer Released", "Joined"];
  const funnel = funnelStages.map((stage) => {
    const reached = db.applications.filter((a) => {
      const i = funnelStages.indexOf(a.stage);
      const j = funnelStages.indexOf(stage);
      return a.stage === "Rejected" ? false : i >= j;
    }).length;
    return { stage, count: reached };
  });

  const categoryDist = Object.entries(
    db.employees
      .filter((e) => e.doctorProfile)
      .reduce<Record<string, number>>((acc, e) => {
        const c = e.doctorProfile!.categories[0] ?? "Other";
        acc[c] = (acc[c] ?? 0) + 1;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));

  const aging = ["Not due", "1-30 days", "31-60 days", "61-90 days", "90+ days"].map((bucket) => ({
    bucket,
    amount: db.invoices
      .filter((i) => i.outstanding > 0 && hospitalIds.has(i.hospitalId) && agingBucket(i.dueDate, now) === bucket)
      .reduce((s, i) => s + i.outstanding, 0),
    count: db.invoices.filter((i) => i.outstanding > 0 && hospitalIds.has(i.hospitalId) && agingBucket(i.dueDate, now) === bucket).length,
  }));

  const widgets = {
    recentHospitalActivity: db.activityLogs
      .filter((a) => !a.hospitalId || hospitalIds.has(a.hospitalId))
      .slice(0, 8)
      .map((a) => ({ ...a, actor: db.users.find((u) => u.id === a.actorId)?.name ?? "System", hospital: a.hospitalId ? db.hospitals.find((h) => h.id === a.hospitalId)?.name : undefined })),
    upcomingInterviews: db.interviews
      .filter((i) => i.status === "Scheduled" && new Date(i.scheduledAt) >= new Date(now.getTime() - 86400000))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 6)
      .map((i) => ({ ...i, candidate: db.candidates.find((c) => c.id === i.candidateId)?.name ?? "Candidate", job: db.requisitions.find((j) => j.id === i.requisitionId)?.jobCode ?? "" })),
    joiningThisWeek: db.employees
      .filter((e) => e.dateOfJoining >= today && e.dateOfJoining <= new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10))
      .map((e) => ({ id: e.id, name: e.name, designation: e.designation, dateOfJoining: e.dateOfJoining })),
    upcomingShifts: db.shifts
      .filter((s) => s.date >= today && hospitalIds.has(s.hospitalId) && s.status === "Scheduled")
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .slice(0, 8)
      .map((s) => ({ ...s, employee: db.employees.find((e) => e.id === s.employeeId)?.name ?? "", hospital: db.hospitals.find((h) => h.id === s.hospitalId)?.name ?? "" })),
    pendingApprovals: [
      ...db.leaveRequests.filter((l) => l.status === "Pending").map((l) => ({ type: "Leave", id: l.id, label: `${db.employees.find((e) => e.id === l.employeeId)?.name} · ${l.type}`, link: "/workforce/leave" })),
      ...db.expenses.filter((e) => ["Submitted", "Under Review"].includes(e.status)).map((e) => ({ type: "Expense", id: e.id, label: `${e.category} · ₹${e.amount.toLocaleString("en-IN")}`, link: "/erp/expenses" })),
      ...db.invoices.filter((i) => i.status === "Pending Approval").map((i) => ({ type: "Invoice", id: i.id, label: `${i.invoiceNo} · ₹${i.totalAmount.toLocaleString("en-IN")}`, link: "/erp/invoices" })),
      ...db.attendance.filter((a) => a.correctionRequested && !a.approvedBy).map((a) => ({ type: "Attendance", id: a.id, label: `${db.employees.find((e) => e.id === a.employeeId)?.name} · ${a.date}`, link: "/workforce/attendance" })),
      ...db.purchaseOrders.filter((p) => p.status === "Pending Approval").map((p) => ({ type: "Purchase Order", id: p.id, label: `${p.poNo} · ${p.vendor}`, link: "/erp/purchase-orders" })),
    ].slice(0, 10),
    contractExpirations: db.contracts
      .filter((c) => hospitalIds.has(c.hospitalId))
      .map((c) => ({
        id: c.id,
        number: c.number,
        hospital: db.hospitals.find((h) => h.id === c.hospitalId)?.name ?? "",
        endDate: c.endDate,
        daysLeft: Math.floor((new Date(c.endDate).getTime() - now.getTime()) / 86400000),
        status: c.status,
      }))
      .filter((c) => c.daysLeft <= 120)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6),
    overduePayments: db.invoices
      .filter((i) => i.outstanding > 0 && hospitalIds.has(i.hospitalId) && agingBucket(i.dueDate, now) !== "Not due")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6)
      .map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        hospital: db.hospitals.find((h) => h.id === i.hospitalId)?.name ?? "",
        outstanding: i.outstanding,
        daysOverdue: Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / 86400000),
      })),
    payrollStatus: db.payrollRuns.slice(0, 4).map((r) => ({ id: r.id, period: r.period, status: r.status, totalNet: r.totalNet, totalEmployees: r.totalEmployees, locked: r.locked })),
    notifications: db.notifications
      .filter((n) => n.audience === "All" || (Array.isArray(n.audience) && (n.audience as Role[]).includes(user.role)))
      .slice(0, 6)
      .map((n) => ({ ...n, unread: !n.readBy.includes(user.id) })),
    unassignedShifts: db.shifts.filter((s) => s.date >= today && !s.employeeId).length,
  };

  return {
    kpis,
    charts: { revenueVsPayroll, deploymentTrend, hospitalRevenue, funnel, categoryDist, aging },
    widgets,
    meta: { period, generatedAt: new Date().toISOString(), isPortal, role: user.role },
  };
}

function buildFinance(db: Database, user: User) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hospitals = scopeHospitals(db, user);
  const hospitalIds = new Set(hospitals.map((h) => h.id));
  const months = last12(db);

  const rows = months.map((m) => {
    const inv = db.invoices.filter((i) => i.billingPeriod === m && hospitalIds.has(i.hospitalId));
    const run = db.payrollRuns.find((r) => r.period === m);
    const exp = db.expenses.filter((e) => e.expenseDate.startsWith(m) && ["Approved", "Reimbursed"].includes(e.status));
    const invoiced = inv.reduce((s, i) => s + i.totalAmount, 0);
    const collected = inv.reduce((s, i) => s + i.amountPaid, 0);
    // The in-progress month posts a full payroll run while billing is still
    // accruing, so scale payroll and expenses to the elapsed part of the month.
    const isCurrentMonth = m === period;
    const elapsed = isCurrentMonth ? now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 1;
    const payroll = roundMoney((run?.totalNet ?? 0) * elapsed);
    const expenses = roundMoney(exp.reduce((s, e) => s + e.amount, 0) * elapsed);
    return {
      month: m,
      label: m,
      projected: db.deployments.filter((d) => d.status === "Active" || d.status === "Confirmed").reduce((s, d) => s + d.monthlyHospitalBilling, 0),
      invoiced,
      collected,
      payroll,
      expenses,
      grossMargin: invoiced - payroll,
      operatingSurplus: invoiced - payroll - expenses,
      receivables: invoiced - collected,
      partialMonth: isCurrentMonth,
    };
  });

  const profitability = hospitalProfitability(db).filter((r) => hospitalIds.has(r.hospitalId));
  const expenseBreakdown = Object.entries(
    db.expenses
      .filter((e) => ["Approved", "Reimbursed"].includes(e.status))
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return { rows, profitability, expenseBreakdown, period };
}

function buildPayrollReports(db: Database, user: User) {
  const months = last12(db);
  const rows = months.map((m) => {
    const run = db.payrollRuns.find((r) => r.period === m);
    const items = db.payrollItems.filter((i) => i.runId === run?.id);
    return {
      month: m,
      label: m,
      employees: run?.totalEmployees ?? 0,
      gross: run?.totalGross ?? items.reduce((s, i) => s + i.grossEarnings, 0),
      deductions: run?.totalDeductions ?? items.reduce((s, i) => s + i.totalDeductions, 0),
      net: run?.totalNet ?? items.reduce((s, i) => s + i.netSalary, 0),
      professionalTax: items.reduce((s, i) => s + i.professionalTax, 0),
      providentFund: items.reduce((s, i) => s + i.providentFund, 0),
      esi: items.reduce((s, i) => s + i.esi, 0),
      tds: items.reduce((s, i) => s + i.tds, 0),
      incentives: items.reduce((s, i) => s + i.incentives, 0),
      overtime: items.reduce((s, i) => s + i.overtimeAmount, 0),
      status: run?.status ?? "Not started",
    };
  });
  const dept = Object.entries(
    db.employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.department] = (acc[e.department] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, headcount]) => ({ name, headcount }));
  const currentPeriodValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const sample = db.employees
    .filter((e) => db.salaryStructures.some((s) => s.employeeId === e.id))
    .slice(0, 200)
    .map((e) => {
      const s = db.salaryStructures.filter((x) => x.employeeId === e.id).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
      const stats = periodStats(db, e.id, currentPeriodValue);
      return {
        employeeId: e.id,
        code: e.employeeCode,
        name: e.name,
        designation: e.designation,
        department: e.department,
        monthlyCtc: Math.round(s.ctc / 12),
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        overtimeHours: stats.overtimeHours,
      };
    });
  return { rows, dept, sample, period: currentPeriodValue, role: user.role };
}

function buildRecruitmentReports(db: Database) {
  const funnelStages = ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Interview Completed", "Selected", "Offer Released", "Joined"];
  const funnel = funnelStages.map((stage) => {
    const idx = funnelStages.indexOf(stage);
    return { stage, count: db.applications.filter((a) => funnelStages.indexOf(a.stage) >= idx && a.stage !== "Rejected").length };
  });
  const sources = Object.entries(
    db.candidates.reduce<Record<string, number>>((acc, c) => {
      acc[c.source] = (acc[c.source] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, candidates]) => {
    const apps = db.applications.filter((a) => {
      const c = db.candidates.find((x) => x.id === a.candidateId);
      return c?.source === name;
    });
    const joined = apps.filter((a) => a.stage === "Joined").length;
    const offers = apps.filter((a) => ["Offer Released", "Joined"].includes(a.stage)).length;
    return {
      name,
      candidates,
      applications: apps.length,
      shortlisted: apps.filter((a) => !["Applied", "Screening", "Rejected"].includes(a.stage)).length,
      offers,
      joined,
      conversionRate: apps.length ? Math.round((joined / apps.length) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.candidates - a.candidates);

  const timeToHire = db.applications
    .filter((a) => a.stage === "Joined")
    .map((a) => {
      const days = Math.max(1, Math.floor((new Date(a.updatedAt).getTime() - new Date(a.appliedAt).getTime()) / 86400000));
      return {
        name: db.candidates.find((c) => c.id === a.candidateId)?.name ?? "Candidate",
        job: db.requisitions.find((j) => j.id === a.requisitionId)?.jobCode ?? "",
        days,
        appliedAt: a.appliedAt,
        joinedAt: a.updatedAt,
      };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 12);

  const byRequisition = db.requisitions.slice(0, 20).map((j) => {
    const apps = db.applications.filter((a) => a.requisitionId === j.id);
    return {
      jobCode: j.jobCode,
      hospital: db.hospitals.find((h) => h.id === j.hospitalId)?.name ?? "",
      designation: j.designation,
      vacancies: j.vacancies,
      filled: j.filled,
      applications: apps.length,
      status: j.status,
      priority: j.priority,
    };
  });

  return { funnel, sources, timeToHire, byRequisition, rejectionReasons: Object.entries(
    db.applications.filter((a) => a.stage === "Rejected").reduce<Record<string, number>>((acc, a) => {
      const r = a.rejectedReason || "Unspecified";
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })) };
}

function buildOperations(db: Database) {
  const active = db.deployments.filter((d) => d.status === "Active" || d.status === "Confirmed");
  const byHospital = db.hospitals
    .map((h) => ({
      hospital: h.name,
      city: h.city,
      beds: h.beds,
      required: db.requirements.filter((r) => r.hospitalId === h.id).reduce((s, r) => s + r.count, 0),
      allocated: db.requirements.filter((r) => r.hospitalId === h.id).reduce((s, r) => s + r.allocated, 0),
      deployed: active.filter((d) => d.hospitalId === h.id).length,
      margin: active.filter((d) => d.hospitalId === h.id).reduce((s, d) => s + (d.monthlyHospitalBilling - d.monthlySalary), 0),
    }))
    .filter((r) => r.required > 0 || r.deployed > 0)
    .sort((a, b) => b.deployed - a.deployed);

  const shiftCoverage = ["Day", "Night", "Rotational", "General", "On Call"].map((type) => ({
    type,
    scheduled: db.shifts.filter((s) => s.type === type).length,
    completed: db.shifts.filter((s) => s.type === type && s.status === "Completed").length,
    missed: db.shifts.filter((s) => s.type === type && s.status === "Missed").length,
  }));

  const doctorHistory = db.employees
    .filter((e) => e.doctorProfile && db.deployments.some((d) => d.employeeId === e.id))
    .slice(0, 40)
    .map((e) => {
      const deps = db.deployments.filter((d) => d.employeeId === e.id);
      return {
        employeeId: e.id,
        name: e.name,
        designation: e.designation,
        deployments: deps.length,
        current: deps.find((d) => d.status === "Active" || d.status === "Confirmed")?.deploymentCode ?? "—",
        totalBilled: db.invoices.reduce((s, i) => s + i.items.filter((it) => it.employeeId === e.id).reduce((t, it) => t + it.amount, 0), 0),
        totalCost: deps.reduce((s, d) => s + d.monthlySalary, 0),
      };
    })
    .sort((a, b) => b.totalBilled - a.totalBilled);

  return { byHospital, shiftCoverage, doctorHistory, openRequirements: db.requirements.filter((r) => r.status !== "Closed").length };
}

/**
 * Doctor directory read model.
 *
 * One row per registered doctor, joined to their live deployment, attendance and
 * payroll history so the directory answers "who can we place, and how have they
 * performed" without a second request.
 */
function buildDoctors(db: Database, user: User) {
  const today = new Date().toISOString().slice(0, 10);
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  // The doctor portal reuses this screen as "My Profile", so it must only ever
  // see that doctor's own row.
  const onlyEmployee = user.role === "Doctor" ? user.employeeId : undefined;

  const rows = db.employees
    .filter((e) => e.doctorProfile)
    .filter((e) => (onlyEmployee ? e.id === onlyEmployee : true))
    .map((e) => {
      const dep = db.deployments.find((d) => d.employeeId === e.id && (d.status === "Active" || d.status === "Confirmed"));
      const stats = periodStats(db, e.id, period);
      const structure = db.salaryStructures
        .filter((s) => s.employeeId === e.id)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
      const balance = db.leaveBalances.find((b) => b.employeeId === e.id);
      return {
        id: e.id,
        employeeCode: e.employeeCode,
        name: e.name,
        email: e.email,
        phone: e.phone,
        designation: e.designation,
        city: e.city ?? "",
        state: e.state ?? "",
        specialisation: e.doctorProfile!.specialisation,
        categories: e.doctorProfile!.categories,
        registrationCouncil: e.doctorProfile!.registrationCouncil,
        registrationNumber: e.doctorProfile!.registrationNumber,
        experienceYears: e.doctorProfile!.experienceYears,
        languages: e.doctorProfile!.languages,
        preferredShift: e.doctorProfile!.preferredShift,
        employmentStatus: e.employmentStatus,
        dateOfJoining: e.dateOfJoining,
        deploymentId: dep?.id ?? "",
        deploymentCode: dep?.deploymentCode ?? "",
        hospitalId: dep?.hospitalId ?? "",
        hospital: dep ? db.hospitals.find((h) => h.id === dep.hospitalId)?.name ?? "" : "",
        shift: dep?.shift ?? "",
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        overtimeHours: stats.overtimeHours,
        monthlyCost: structure ? Math.round(structure.ctc / 12) : 0,
        leaveBalance: balance ? balance.casual + balance.sick + balance.earned : 0,
        totalDeployments: db.deployments.filter((d) => d.employeeId === e.id).length,
        availability: dep ? "Deployed" : "Available",
      };
    })
    .sort((a, b) => Number(a.availability === "Available") - Number(b.availability === "Available") || b.experienceYears - a.experienceYears);

  return {
    rows,
    totals: {
      doctors: rows.length,
      available: rows.filter((r) => r.availability === "Available").length,
      deployed: rows.filter((r) => r.availability === "Deployed").length,
      specialisations: new Set(rows.map((r) => r.specialisation)).size,
    },
    period,
    today,
  };
}

const BUILDERS: Record<string, (db: Database, user: User) => unknown> = {
  dashboard: buildDashboard,
  finance: buildFinance,
  "payroll-reports": buildPayrollReports,
  recruitment: buildRecruitmentReports,
  operations: buildOperations,
  doctors: buildDoctors,
};

const PERMISSION: Record<string, Parameters<typeof can>[1]> = {
  dashboard: "dashboard:view",
  finance: "erp:invoices:view",
  "payroll-reports": "payroll:view",
  recruitment: "recruitment:candidates:view",
  operations: "workforce:deployments:view",
  doctors: "workforce:deployments:view",
};

export async function GET(_request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const builder = BUILDERS[key];
  if (!builder) return NextResponse.json({ error: `Unknown aggregate "${key}".` }, { status: 404 });
  if (!can(user.role, PERMISSION[key])) {
    return NextResponse.json({ error: `Role "${user.role}" is not permitted to view this report.` }, { status: 403 });
  }
  const db = await getDb();
  return NextResponse.json(builder(db, user));
}
