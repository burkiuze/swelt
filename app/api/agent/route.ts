import { runAgent, type ChatTurn } from "@/lib/agent";
import { getCaller, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/jobs";
import { getModel } from "@/lib/catalog";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";
import { getPlan } from "@/lib/planServer";
import { defaultLlm, llmAllowed } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  try {
    const body = await req.json();
    const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: ChatTurn) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: ChatTurn) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    if (!history.length || history[history.length - 1].role !== "user") return Response.json({ error: "Send a user message" }, { status: 400 });
    const { plan } = await getPlan(caller.userId, caller.isAdmin);
    const llm: LlmKey = LLMS.some((l) => l.key === body.llm) ? body.llm : defaultLlm(plan);
    if (!llmAllowed(plan, llm)) {
      return Response.json({ error: "Opus 5.5 and GPT-6.1 Sol are part of the Ultra plan. Switch to GLM 5.3 Flash or DeepSeek V4.1 Flash, or upgrade on the Pricing page." }, { status: 403 });
    }
    const effort: Effort = EFFORTS.includes(body.effort) ? body.effort : "medium";
    const media = typeof body.media === "string" && getModel(body.media) ? body.media : undefined;
    return Response.json(await runAgent(caller, history, { llm, effort, approval: Boolean(body.approval), media }));
  } catch (e) {
    return errorResponse(e);
  }
}
