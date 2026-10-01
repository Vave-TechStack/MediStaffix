"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { cn, relativeTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationRow } from "./notification-center-types";

export type { NotificationRow };

export function NotificationCenter({ initial = [] }: { initial?: NotificationRow[] }) {
  const [items, setItems] = useState<NotificationRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await api.get<{ notifications: NotificationRow[] }>("/api/notifications");
      setItems(db.notifications);
    } catch {
      /* keep last known list */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const unread = items.filter((n) => n.unread).length;

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    await api.action("notification.read", { all: true }).catch(() => undefined);
  };

  const severityDot: Record<NotificationRow["severity"], string> = {
    Info: "bg-sky-500",
    Success: "bg-emerald-500",
    Warning: "bg-amber-500",
    Critical: "bg-red-500",
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg text-muted ring-focus transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div>
            <p className="text-[13.5px] font-semibold">Notifications</p>
            <p className="text-[11.5px] text-muted">{unread} unread</p>
          </div>
          <div className="flex items-center gap-1">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
            <button
              onClick={markAll}
              disabled={!unread}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-sea-700 ring-focus hover:bg-[var(--surface-2)] disabled:opacity-50 dark:text-mint-400"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted">No notifications for your role.</p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem key={n.id} asChild>
                <Link
                  href={n.link}
                  onClick={() => {
                    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                    api.action("notification.read", { id: n.id }).catch(() => undefined);
                  }}
                  className={cn("items-start gap-2.5 py-2.5", n.unread && "bg-[var(--surface-2)]")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? severityDot[n.severity] : "bg-[var(--border-strong)]")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium">{n.title}</span>
                      <span className="shrink-0 text-[10.5px] text-muted">{relativeTime(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">{n.body}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="px-3.5 py-2 text-[11.5px] text-muted">
          Notifications are scoped to your role. In-app only — no email or SMS is sent.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationProviderProps() {
  return null;
}
