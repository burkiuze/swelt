import { getCaller, unauthorized } from "@/lib/auth";
import { errorResponse, startJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

// POST /api/run  { "model": "black-forest-labs/flux-1-schnell", "input": { "prompt": "..." } }
export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  try {
    const body = await req.json();
    const model = String(body.model || body.model_id || "");
    const v = await startJob(caller, model, body.input || {}, caller.via === "key" ? "api" : body.source || "playground");
    return Response.json(v, { status: v.status === "FAILED" ? 502 : 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
