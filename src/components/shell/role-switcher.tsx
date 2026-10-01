"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, FlaskConical, LogOut, RotateCcw, ShieldCheck, UserCog } from "lucide-react";
import { api } from "@/lib/client";
import { ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/feedback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, User } from "@/lib/types";

/**
 * Demo role switcher.
 *
 * Marked as a demo-only control. It issues a new session for a different
 * seeded user so an evaluator can inspect every permission set without creating
 * accounts. Production deployments disable it (settings.demoMode = false), at
 * which point the endpoint refuses the switch.
 */
export function RoleSwitcher({ current, users, demoMode }: { current: User; users: Pick<User, "id" | "name" | "role" | "email" | "avatarColor" | "department">[]; demoMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const switchTo = async (userId: string, name: string) => {
    setBusy(true);
    try {
      const res = await api.post<{ role: Role; name: string }>("/api/auth/switch", { userId });
      toast.success(`Now viewing as ${name} (${res.role}).`);
      router.refresh();
      // Full reload guarantees every server component re-reads permissions.
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch role.");
      setBusy(false);
    }
  };

  const byRole = users.reduce<Record<string, typeof users>>((acc, u) => {
    (acc[u.role] ??= []).push(u);
    return acc;
  }, {});

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 ring-focus transition-colors hover:bg-[var(--surface-2)]">
          <Avatar name={current.name} color={current.avatarColor} size={30} />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[150px] truncate text-[13px] font-semibold leading-tight">{current.name}</span>
            <span className="block text-[11.5px] leading-tight text-muted">{current.role}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[330px]">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-2.5 pb-2">
          <p className="text-[13px] font-medium">{current.name}</p>
          <p className="text-[11.5px] text-muted">{current.email}</p>
          <p className="mt-1.5 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[11.5px] leading-snug text-muted">
            {ROLE_DESCRIPTIONS[current.role]}
          </p>
        </div>
        <DropdownMenuSeparator />
        {demoMode ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <FlaskConical className="h-3 w-3" /> Demo environment — switch role
            </DropdownMenuLabel>
            <div className="max-h-[320px] overflow-y-auto">
              {Object.entries(byRole).map(([role, list]) => (
                <div key={role} className="mb-1">
                  <p className="px-2.5 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{role}</p>
                  {list.map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      disabled={busy}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (u.id !== current.id) void switchTo(u.id, u.name);
                      }}
                      className={cn("py-1.5", u.id === current.id && "bg-[var(--surface-2)]")}
                    >
                      <Avatar name={u.name} color={u.avatarColor} size={22} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">{u.name}</span>
                        <span className="block truncate text-[11px] text-muted">{u.department}</span>
                      </span>
                      {u.id === current.id ? <ShieldCheck className="h-3.5 w-3.5 text-mint-600" /> : null}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <a href="/users">
            <UserCog className="h-4 w-4" /> User &amp; role management
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">
            <ShieldCheck className="h-4 w-4" /> Settings &amp; audit log
          </a>
        </DropdownMenuItem>
        {demoMode ? (
          <DropdownMenuItem
            destructive
            onSelect={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const res = await api.action<{ message: string }>("demo.reset");
                toast.success(res.message);
                window.location.href = "/dashboard";
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Reset failed.");
                setBusy(false);
              }
            }}
          >
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={async (e) => {
            e.preventDefault();
            await api.post("/api/auth/logout", {});
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
