import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/feedback";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const db = await getDb();
  const users = db.users
    .filter((u) => u.status === "Active")
    .map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email, avatarColor: u.avatarColor, department: u.department }));
  const hint = db.users[0]?.passwordHint ?? "Demo@2026";

  return (
    <Suspense fallback={<div className="p-10"><Skeleton className="h-10 w-72" /></div>}>
      <LoginForm users={users} demoMode={db.settings.demoMode} hint={hint} />
    </Suspense>
  );
}
