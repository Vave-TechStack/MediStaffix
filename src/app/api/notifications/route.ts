/** Role-scoped notification feed for the notification centre. */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const db = await getDb();
  const notifications = db.notifications
    .filter((n) => n.audience === "All" || (Array.isArray(n.audience) && n.audience.includes(user.role)))
    .slice(0, 40)
    .map((n) => ({ ...n, unread: !n.readBy.includes(user.id) }));
  return NextResponse.json({ notifications });
}
