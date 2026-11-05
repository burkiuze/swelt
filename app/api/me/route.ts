import { getCaller } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caller = await getCaller(req).catch(() => null);
  if (!caller) return Response.json({ signedIn: false });
  return Response.json({ signedIn: true, credits: caller.profile ? Number(caller.profile.credits) : null, unlimited: caller.isAdmin, email: caller.email });
}
