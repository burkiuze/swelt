import { getCaller, unauthorized } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { dbEnabled, redeemCode } from "@/lib/db";
import { forgetPlans } from "@/lib/planServer";
import { planOfCode } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Best-effort throttle per instance to slow down code guessing.
const attempts = new Map<string, { n: number; at: number }>();

export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller || caller.via !== "session") return unauthorized("Sign in to redeem a code");
  if (!dbEnabled()) return Response.json({ error: "Database is not configured" }, { status: 503 });

  const now = Date.now();
  const a = attempts.get(caller.userId);
  if (a && now - a.at < 10 * 60_000 && a.n >= 10) {
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const { code } = await req.json().catch(() => ({ code: "" }));
  const clean = normalizeCode(String(code || ""));
  if (clean.length < 8) return Response.json({ error: "Enter a valid code" }, { status: 400 });

  try {
    const res = await redeemCode(caller.userId, caller.email, clean);
    attempts.delete(caller.userId);
    forgetPlans();
    return Response.json({ ok: true, added: Number(res.added), credits: Number(res.credits), plan: planOfCode(clean) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid_or_used/.test(msg)) {
      attempts.set(caller.userId, { n: a && now - a.at < 10 * 60_000 ? a.n + 1 : 1, at: a && now - a.at < 10 * 60_000 ? a.at : now });
      return Response.json({ error: "This code is invalid or has already been used." }, { status: 400 });
    }
    return Response.json({ error: "Could not redeem the code. Please try again." }, { status: 500 });
  }
}
