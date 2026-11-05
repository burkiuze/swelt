import { runAgent, type ChatTurn } from "@/lib/agent";
import { getCaller, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/jobs";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";

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
    const llm: LlmKey = LLMS.some((l) => l.key === body.llm) ? body.llm : "opus";
    const effort: Effort = EFFORTS.includes(body.effort) ? body.effort : "medium";
    return Response.json(await runAgent(caller, history, { llm, effort, approval: Boolean(body.approval) }));
  } catch (e) {
    return errorResponse(e);
  }
}
