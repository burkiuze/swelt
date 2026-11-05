import { getCaller, unauthorized } from "@/lib/auth";
import { errorResponse, pollJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  try {
    const { id } = await ctx.params;
    return Response.json(await pollJob(caller, id));
  } catch (e) {
    return errorResponse(e);
  }
}
