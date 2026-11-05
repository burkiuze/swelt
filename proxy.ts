import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const PROTECTED = [/^\/assets/, /^\/agent/, /^\/usage/, /^\/code/];

// Paths only vulnerability scanners ask for.
const SCANNER = /^\/(wp-|wordpress|xmlrpc\.php|phpmyadmin|pma\b|cgi-bin|\.env|\.git|\.aws|\.ssh|\.DS_Store|config\.php|admin\.php|vendor\/phpunit|server-status|actuator)/i;

// [path prefix, requests per minute per IP] — first match wins.
const LIMITS: [RegExp, number][] = [
  [/^\/api\/(redeem|admin)/, 20],
  [/^\/api\/auth\//, 30],
  [/^\/api\/(agent|run|upload)/, 30],
  [/^\/api\//, 150],
];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (SCANNER.test(pathname)) return new NextResponse("Not found", { status: 404 });

  if (pathname.startsWith("/api/")) {
    const ip = clientIp(req.headers);
    const hit = LIMITS.find(([re]) => re.test(pathname));
    if (hit) {
      const r = rateLimit(`${hit[0].source}:${ip}`, hit[1], 60_000);
      if (!r.ok) {
        return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
      }
    }
    // Browsers must not post to our API from other sites.
    const origin = req.headers.get("origin");
    if (origin && req.method !== "GET" && req.method !== "HEAD" && !pathname.startsWith("/api/auth/")) {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      try {
        if (new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
      } catch {
        return NextResponse.json({ error: "Bad origin" }, { status: 403 });
      }
    }
    return;
  }

  if (!req.auth && PROTECTED.some((r) => r.test(pathname))) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|previews/).*)"],
};
