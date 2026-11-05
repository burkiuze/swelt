import { getCaller, unauthorized } from "@/lib/auth";
import { dbEnabled, stats } from "@/lib/db";
import { errorResponse } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  try {
    const s = dbEnabled() ? await stats(caller.userId) : { requests_7d: 0, errors_7d: 0, cost_7d: 0, daily: [], recent_models: [] };
    return Response.json({ ...s, credits: caller.profile ? Number(caller.profile.credits) : null, unlimited: caller.isAdmin, email: caller.email });
  } catch (e) {
    return errorResponse(e);
  }
}
