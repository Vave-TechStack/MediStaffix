"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, Logo } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationCenter } from "./notification-center";
import { RoleSwitcher } from "./role-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Breadcrumbs } from "./breadcrumbs";
import type { Role, User } from "@/lib/types";
import type { NotificationRow } from "./notification-center-types";

export function AppShell({
  user,
  users,
  demoMode,
  notifications,
  badges,
  labelMap,
  children,
}: {
  user: User;
  users: Pick<User, "id" | "name" | "role" | "email" | "avatarColor" | "department">[];
  demoMode: boolean;
  notifications: NotificationRow[];
  badges: Record<string, number>;
  labelMap: Record<string, string>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar role={user.role as Role} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} badges={badges} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-brand-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <Sidebar role={user.role as Role} collapsed={false} onToggle={() => setMobileOpen(false)} badges={badges} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-5"
          style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(10px)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-muted ring-focus hover:bg-[var(--surface-2)] md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden">
            <Logo compact tone="dark" />
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
            <div className="hidden xl:block">
              <Breadcrumbs labelMap={labelMap} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <GlobalSearch />
            </div>
            <button
              onClick={() => {
                const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                window.dispatchEvent(ev);
              }}
              className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-muted ring-focus hover:bg-[var(--surface-2)] sm:hidden"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <NotificationCenter initial={notifications} />
            <div className="h-6 w-px" style={{ background: "var(--border)" }} />
            <RoleSwitcher current={user} users={users} demoMode={demoMode} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="mb-4 xl:hidden">
              <Breadcrumbs labelMap={labelMap} />
            </div>
            <div key={pathname} className="animate-fade-up">
              {children}
            </div>
          </div>
        </main>

        <footer
          className={cn("border-t px-5 py-3 text-[11.5px] text-muted", "flex flex-wrap items-center justify-between gap-2")}
          style={{ borderColor: "var(--border)" }}
        >
          <span>MediStaffix · Connecting Healthcare Talent with Hospitals</span>
          <span>
            Demonstration build · fictional data only · last render {new Date().toLocaleDateString("en-IN")}
          </span>
        </footer>
      </div>
    </div>
  );
}
