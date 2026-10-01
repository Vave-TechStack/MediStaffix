import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ExecutiveDashboard } from "./dashboard-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user.role, "dashboard:view")) redirect("/dashboard");
  return <ExecutiveDashboard />;
}
