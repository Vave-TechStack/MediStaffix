/**
 * In-memory rate limiter for the demo deployment.
 *
 * A production deployment would enforce limits at the edge (or with a shared
 * store such as Redis). This implementation is process-local and is documented
 * as such: it protects the demo instance, not a multi-node deployment.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function tooManyRequests(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({ error: `Too many requests. Retry in ${retryAfterSeconds} seconds.` }),
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
