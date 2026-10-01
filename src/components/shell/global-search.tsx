"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CornerDownLeft, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

interface Hit {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get<{ hits: Hit[] }>("/api/search", { q })
        .then((res) => {
          setHits(res.hits);
          setCursor(0);
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (hit: Hit) => {
    setOpen(false);
    setQ("");
    router.push(hit.href);
  };

  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => {
    (acc[h.group] ??= []).push(h);
    return acc;
  }, {});

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
        className="flex h-9.5 w-full items-center gap-2 rounded-lg border px-3 text-sm text-muted ring-focus transition-colors hover:border-sea-400"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)", maxWidth: 420 }}
        aria-label="Search"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search hospitals, doctors, invoices…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border px-1.5 py-0.5 text-[10.5px] font-medium sm:inline" style={{ borderColor: "var(--border-strong)" }}>
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Global search">
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-lift)]" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5 border-b px-4" style={{ borderColor: "var(--border)" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : <Search className="h-4 w-4 text-muted" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, hits.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter" && hits[cursor]) {
                    go(hits[cursor]);
                  }
                }}
                placeholder="Search across CRM, recruitment, workforce, finance and documents…"
                className="h-13 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted/70"
                style={{ height: 52 }}
                autoComplete="off"
              />
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted ring-focus hover:bg-[var(--surface-2)]" aria-label="Close search">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted">Type at least two characters to search.</p>
              ) : !loading && hits.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted">No records match “{q}”.</p>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group} className="mb-1.5">
                    <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{group}</p>
                    {items.map((h) => {
                      const index = hits.indexOf(h);
                      return (
                        <button
                          key={`${h.type}-${h.id}`}
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => go(h)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ring-focus transition-colors",
                            index === cursor ? "bg-[var(--surface-2)]" : ""
                          )}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                            <Building2 className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium">{h.title}</span>
                            <span className="block truncate text-[12px] text-muted">{h.subtitle}</span>
                          </span>
                          <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10.5px] text-muted" style={{ borderColor: "var(--border)" }}>
                            {h.type}
                          </span>
                          {index === cursor ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 border-t px-4 py-2 text-[11.5px] text-muted" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <span>↑↓ navigate</span>
              <span>⏎ open</span>
              <span>esc close</span>
              <span className="ml-auto">Results respect your role permissions.</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
