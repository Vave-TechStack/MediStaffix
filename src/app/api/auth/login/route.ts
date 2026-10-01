import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticate, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getDb, mutate, recordAudit } from "@/lib/store";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`login:${ip}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = await getDb();
  const user = authenticate(body.email, body.password!, db);
  if (!user) {
    await mutate((d) => {
      recordAudit(d, undefined, "LOGIN_FAILED", "User", body.email!, `Failed sign-in attempt for ${body.email}.`);
    });
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await mutate((d) => {
    recordAudit(d, user, "LOGIN", "User", user.id, `${user.name} signed in.`);
  });

  const token = await createSessionToken(user);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
}

export async function GET() {
  const db = await getDb();
  return NextResponse.json({ demoMode: db.settings.demoMode });
}
