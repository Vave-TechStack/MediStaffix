"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("msx-theme") as Mode | null) ?? "system";
    setMode(stored);
    setMounted(true);
  }, []);

  const apply = (next: Mode) => {
    setMode(next);
    localStorage.setItem("msx-theme", next);
    const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  };

  const options: { value: Mode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  if (!mounted) {
    return <div className="h-9.5 w-[104px] rounded-lg skeleton" style={{ height: 38 }} />;
  }

  return (
    <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: "var(--border)" }} role="group" aria-label="Colour theme">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => apply(o.value)}
          aria-label={o.label}
          aria-pressed={mode === o.value}
          className={cn(
            "rounded-md p-1.5 ring-focus transition-colors",
            mode === o.value ? "bg-brand-800 text-white dark:bg-mint-600 dark:text-brand-950" : "text-muted hover:text-[var(--text)]"
          )}
        >
          <o.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
