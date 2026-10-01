"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, FlaskConical, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import { ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Avatar } from "@/components/ui/feedback";
import { Logo } from "@/components/shell/sidebar";
import type { Role } from "@/lib/types";

interface DemoUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatarColor: string;
  department: string;
}

export function LoginForm({ users, demoMode, hint }: { users: DemoUser[]; demoMode: boolean; hint: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(users[0]?.email ?? "");
  const [password, setPassword] = useState(hint);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const u = users.find((x) => x.email === email);
    if (u) setPassword(hint);
  }, [email, users, hint]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { email, password });
      toast.success("Signed in. Loading your workspace…");
      router.replace(params.get("next") || "/dashboard");
      window.location.href = params.get("next") || "/dashboard";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const quick = async (u: DemoUser) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { email: u.email, password: hint });
      router.replace("/dashboard");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  };

  const grouped = users.reduce<Record<string, DemoUser[]>>((acc, u) => {
    (acc[u.role] ??= []).push(u);
    return acc;
  }, {});

  const visible = Object.entries(grouped).filter(([role, list]) =>
    filter ? role.toLowerCase().includes(filter.toLowerCase()) || list.some((u) => u.name.toLowerCase().includes(filter.toLowerCase())) : true
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block" style={{ background: "var(--sidebar-bg)" }}>
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(1000px 600px at 12% 8%, rgba(32,184,154,0.22), transparent 60%), radial-gradient(900px 500px at 88% 82%, rgba(23,107,135,0.35), transparent 62%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/30 bg-mint-400/10 px-3 py-1 text-[12px] font-medium text-mint-300">
              <Sparkles className="h-3.5 w-3.5" /> Live demonstration environment
            </span>
            <h1 className="mt-5 text-[40px] font-semibold leading-[1.1] tracking-tight text-white">
              Smarter Healthcare Staffing.
              <br />
              Seamless Workforce Management.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--sidebar-text)]">
              Recruit, deploy, manage and pay healthcare professionals through one connected platform — CRM,
              recruitment, HRM, payroll, doctor deployment, hospital operations and analytics.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { label: "Modules", value: "9" },
                { label: "Demo roles", value: "9" },
                { label: "Sample records", value: "500+" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <p className="text-[22px] font-semibold text-white">{s.value}</p>
                  <p className="text-[12px] text-[var(--sidebar-text)]/80">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">Demonstration data.</span> Every hospital, doctor, registration number,
              contract and financial figure in this environment is fictional. No real patient, credential or payment
              record exists here, and no bank transfer, SMS or email is ever dispatched.
            </p>
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo tone="dark" />
          </div>
          <h2 className="text-[26px] font-semibold tracking-tight">Sign in to MediStaffix</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {demoMode
              ? "Choose any demo role below, or enter the credentials manually."
              : "Enter your credentials to continue."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label required>Email address</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@medistaffix.demo" autoComplete="username" />
            </div>
            <div>
              <Label required>Password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
              {demoMode ? (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Demo password for every seeded account: <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold">{hint}</code>
                </p>
              ) : null}
            </div>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" loading={busy}>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {demoMode ? (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1" style={{ background: "var(--border)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">or explore a role</span>
                <span className="h-px flex-1" style={{ background: "var(--border)" }} />
              </div>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter roles or names…"
                className="mt-4"
              />
              <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {visible.map(([role, list]) => (
                  <div key={role}>
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{role}</p>
                    <div className="space-y-1">
                      {list.map((u) => (
                        <button
                          key={u.id}
                          disabled={busy}
                          onClick={() => quick(u)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ring-focus transition-colors hover:border-sea-400 hover:bg-[var(--surface-2)] disabled:opacity-60",
                            u.email === email ? "border-sea-500 bg-[var(--surface-2)]" : ""
                          )}
                          style={{ borderColor: u.email === email ? "var(--color-sea-500)" : "var(--border)" }}
                        >
                          <Avatar name={u.name} color={u.avatarColor} size={28} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{u.name}</span>
                            <span className="block truncate text-[11.5px] text-muted">{ROLE_DESCRIPTIONS[u.role]}</span>
                          </span>
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : <ArrowRight className="h-3.5 w-3.5 text-muted" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between text-[12px] text-muted">
            <Link href="/" className="inline-flex items-center gap-1.5 ring-focus hover:text-[var(--text)]">
              ← Back to the public site
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Server-enforced RBAC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
