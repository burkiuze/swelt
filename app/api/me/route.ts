import { auth } from "@/auth";
import { getCaller } from "@/lib/auth";
import { getPlan } from "@/lib/planServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caller = await getCaller(req).catch(() => null);
  if (!caller) return Response.json({ signedIn: false });
  const session = caller.via === "session" ? await auth() : null;
  const { plan, expires } = await getPlan(caller.userId, caller.isAdmin);
  return Response.json({
    signedIn: true,
    credits: caller.profile ? Number(caller.profile.credits) : null,
    unlimited: caller.isAdmin,
    email: caller.email,
    name: session?.user?.name ?? null,
    image: session?.user?.image ?? null,
    provider: caller.userId.split(":")[0] ?? null,
    plan,
    planExpires: expires,
  });
}
