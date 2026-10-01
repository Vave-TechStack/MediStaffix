"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, ChevronDown, FlaskConical, HeartPulse, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { can, type Permission } from "@/lib/rbac";
import { navForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function Logo({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "dark" }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg ring-focus">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-sea-600 shadow-md">
        <Activity className="h-5 w-5 text-white" strokeWidth={2.6} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--sidebar-bg)] bg-mint-300" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className={cn("block text-[15.5px] font-bold leading-tight tracking-tight", tone === "light" ? "text-white" : "text-[var(--text)]")}>
            Medi<span className="text-mint-400">Staffix</span>
          </span>
          <span className={cn("block text-[10.5px] leading-tight", tone === "light" ? "text-[var(--sidebar-text)]/70" : "text-muted")}>
            Healthcare Staffing ERP
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  role,
  collapsed,
  onToggle,
  badges,
}: {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const active = navForRole(role).find((item) =>
      item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
    );
    if (active) setOpenGroups((g) => ({ ...g, [active.title]: true }));
  }, [pathname, role]);

  const items = navForRole(role).filter((item) => can(role, item.permission as Permission));

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[262px]"
      )}
      style={{ background: "var(--sidebar-bg)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className={cn("flex h-16 items-center border-b px-4", collapsed ? "justify-center px-0" : "justify-between")} style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <Logo compact={collapsed} />
        {!collapsed ? (
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-[var(--sidebar-text)]/70 ring-focus transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = item.href
              ? pathname === item.href
              : item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
            const groupOpen = openGroups[item.title] ?? Boolean(isActive);
            const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
            const Icon = item.icon;

            if (!item.children) {
              return (
                <li key={item.title}>
                  <Link
                    href={item.href!}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ring-focus",
                      isActive ? "text-white" : "text-[var(--sidebar-text)] hover:bg-white/[0.07] hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                    style={isActive ? { background: "var(--sidebar-active)" } : undefined}
                  >
                    {isActive ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-mint-400" /> : null}
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    {!collapsed ? <span className="truncate">{item.title}</span> : null}
                    {!collapsed && badge ? (
                      <span className="ml-auto rounded-full bg-mint-500/90 px-1.5 py-0.5 text-[10px] font-bold text-brand-950">{badge}</span>
                    ) : null}
                  </Link>
                </li>
              );
            }

            const children = item.children.filter((c) => can(role, c.permission as Permission));
            if (!children.length) return null;

            return (
              <li key={item.title}>
                <button
                  onClick={() => setOpenGroups((g) => ({ ...g, [item.title]: !groupOpen }))}
                  aria-expanded={groupOpen}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-[var(--sidebar-text)] ring-focus transition-colors hover:bg-white/[0.07] hover:text-white",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  {!collapsed ? (
                    <>
                      <span className="truncate">{item.title}</span>
                      {badge ? <span className="ml-auto rounded-full bg-mint-500/90 px-1.5 py-0.5 text-[10px] font-bold text-brand-950">{badge}</span> : null}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", groupOpen && "rotate-180")} />
                    </>
                  ) : null}
                </button>
                {(!collapsed && groupOpen) || (collapsed && isActive) ? (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-0.5 space-y-0.5 overflow-hidden"
                  >
                    {(collapsed ? (isActive ? children : []) : children).map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                      const ChildIcon = child.icon;
                      const childBadge = child.badgeKey ? badges[child.badgeKey] : undefined;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg py-1.5 text-[13px] ring-focus transition-colors",
                              collapsed ? "justify-center px-0 py-2" : "pl-9 pr-2.5",
                              childActive
                                ? "bg-white/[0.09] font-semibold text-white"
                                : "text-[var(--sidebar-text)]/85 hover:bg-white/[0.06] hover:text-white"
                            )}
                            title={collapsed ? child.title : undefined}
                          >
                            {ChildIcon ? <ChildIcon className={cn("h-3.5 w-3.5 shrink-0", childActive && "text-mint-400")} /> : null}
                            {!collapsed ? <span className="truncate">{child.title}</span> : null}
                            {!collapsed && childBadge ? (
                              <span className="ml-auto shrink-0 rounded-full bg-white/[0.14] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                {childBadge > 99 ? "99+" : childBadge}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </motion.ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2">
          <HeartPulse className="h-4 w-4 shrink-0 text-mint-400" />
          {!collapsed ? (
            <p className="text-[11px] leading-tight text-[var(--sidebar-text)]/85">
              <span className="block font-semibold text-white">Demo environment</span>
              All records are fictional
            </p>
          ) : null}
        </div>
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-lg py-2 text-[var(--sidebar-text)] ring-focus transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <p className="flex items-start gap-1.5 px-1 text-[10.5px] leading-snug text-[var(--sidebar-text)]/60">
            <FlaskConical className="mt-0.5 h-3 w-3 shrink-0" />
            Payment and message workflows are simulated locally. Nothing is sent to a bank, SMS or email gateway.
          </p>
        )}
      </div>
    </aside>
  );
}
