/**
 * Global search across every module the signed-in role is allowed to see.
 * Results are permission filtered server-side, so a Hospital Client never
 * receives another client's records even by guessing an identifier.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/store";
import { globalSearch } from "@/lib/workflows/system";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit("search", 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const db = await getDb();
  const hits = globalSearch(db, user, q);
  return NextResponse.json({ hits, query: q });
}
