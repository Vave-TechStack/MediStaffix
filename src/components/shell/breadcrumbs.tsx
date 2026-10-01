"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Breadcrumb trail derived from the current pathname and page label map. */
export function Breadcrumbs({ labelMap }: { labelMap: Record<string, string> }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const parentPath = useMemo(
    () => (segments.length < 2 ? null : `/${segments.slice(0, -1).join("/")}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname]
  );
  const [parentLabel, setParentLabel] = useState<string | null>(null);

  useEffect(() => {
    setParentLabel(parentPath ? labelMap[parentPath] ?? null : null);
  }, [parentPath, labelMap]);

  const current = labelMap[pathname] ?? (segments.length ? segments[segments.length - 1].replace(/-/g, " ") : "Dashboard");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-muted">
      <Link href="/dashboard" className="inline-flex items-center gap-1 rounded ring-focus hover:text-[var(--text)]">
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">MediStaffix</span>
      </Link>
      {parentLabel ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          <span className="truncate">{parentLabel}</span>
        </>
      ) : null}
      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      <span className={cn("truncate font-medium capitalize text-[var(--text)]")}>{current}</span>
    </nav>
  );
}
