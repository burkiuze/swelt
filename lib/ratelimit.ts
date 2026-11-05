// Small fixed-window rate limiter (per server instance). Vercel runs a few
// instances, so treat limits as approximate; it still stops floods and scripts.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (hits.size > 50_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  e.n++;
  return { ok: e.n <= limit, retryAfter: Math.ceil((e.reset - now) / 1000) };
}

export function clientIp(headers: Headers) {
  return (headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}
