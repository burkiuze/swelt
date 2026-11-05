import { getCaller } from "@/lib/auth";
import { errorResponse } from "@/lib/jobs";
import { plansByUser } from "@/lib/planServer";
import { listProfiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ADMINS = () => (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Admin: every account with its plan, credits and days left on the plan.
export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller || caller.via !== "session" || !caller.isAdmin) return Response.json({ error: "Admins only" }, { status: 403 });
  try {
    const [profiles, plans] = await Promise.all([listProfiles(), plansByUser()]);
    const admins = ADMINS();
    const now = Date.now();
    const items = profiles.map((p) => {
      const email = p.email ?? null;
      const isAdmin = !!email && admins.includes(email.toLowerCase());
      const pl = plans.get(p.user_id);
      const plan = isAdmin ? "admin" : pl?.plan ?? "free";
      const expires = isAdmin ? null : pl?.expires ?? null;
      const daysLeft = expires ? Math.max(0, Math.ceil((new Date(expires).getTime() - now) / 86_400_000)) : null;
      return {
        user_id: p.user_id,
        provider: p.user_id.split(":")[0] || null,
        email,
        username: email ? email.split("@")[0] : p.user_id.split(":").slice(1).join(":").slice(0, 12),
        credits: Number(p.credits) || 0,
        plan,
        expires,
        days_left: daysLeft,
        codes_redeemed: pl?.codes ?? 0,
        created_at: p.created_at,
      };
    });
    return Response.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
