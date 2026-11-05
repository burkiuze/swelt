import { after } from "next/server";
import { runAgent, type ChatTurn } from "@/lib/agent";
import { dbEnabled, finishGeneration, getGeneration, insertGeneration } from "@/lib/db";
import { getCaller, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/jobs";
import { getAnyModel } from "@/lib/fal";
import { blockedReason } from "@/lib/safety";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";
import { getPlan } from "@/lib/planServer";
import { defaultLlm, llmAllowed, modelAllowed } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AGENT_RUN = "vlipa/agent-run";

// GET /api/agent?id=<run id> → { status } until done, then { status: "COMPLETED", result } or { status: "FAILED", error }.
export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  try {
    const run = await getGeneration(caller.userId, id);
    if (!run || run.model_id !== AGENT_RUN) return Response.json({ error: "Not found" }, { status: 404 });
    if (run.status === "COMPLETED") return Response.json({ status: "COMPLETED", result: run.output });
    if (run.status === "FAILED") return Response.json({ status: "FAILED", error: run.error || "The agent failed. Please try again." });
    const age = Date.now() - new Date(run.created_at).getTime();
    if (age > 330_000) {
      await finishGeneration(run.id, { status: "FAILED", output: null, media_url: null, cost: 0, error: "The agent timed out", charge: false }).catch(() => {});
      return Response.json({ status: "FAILED", error: "The agent took too long to answer. Please try again." });
    }
    return Response.json({ status: "IN_PROGRESS" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  try {
    const body = await req.json();
    const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: ChatTurn) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: ChatTurn) => ({ role: m.role, content: m.content.slice(0, 8000) }));
    if (!history.length || history[history.length - 1].role !== "user") return Response.json({ error: "Send a user message" }, { status: 400 });
    const blocked = blockedReason(history[history.length - 1].content);
    if (blocked) return Response.json({ error: blocked }, { status: 400 });
    const { plan } = await getPlan(caller.userId, caller.isAdmin);
    const llm: LlmKey = LLMS.some((l) => l.key === body.llm) ? body.llm : defaultLlm(plan);
    if (!llmAllowed(plan, llm)) {
      return Response.json({ error: "Opus 5.5 and GPT-6.1 Sol are part of the Ultra plan. Switch to GLM 5.3 Flash or DeepSeek V4.1 Flash, or upgrade on the Pricing page." }, { status: 403 });
    }
    const effort: Effort = EFFORTS.includes(body.effort) ? body.effort : "medium";
    const picked = typeof body.media === "string" ? await getAnyModel(body.media) : undefined;
    if (picked && !modelAllowed(plan, picked)) {
      const tier = picked.provider === "fal" ? "Ultra plan" : "Pro and Ultra plans";
      return Response.json({ error: `${picked.name} is included in the ${tier}. Pick another model or upgrade on the Pricing page.` }, { status: 403 });
    }
    const media = picked?.id;
    const opts = { llm, effort, approval: Boolean(body.approval), media, mediaModel: picked, plan };

    // Without a database, answer synchronously (local dev).
    if (!dbEnabled()) return Response.json(await runAgent(caller, history, opts));

    // Run in the background so a dropped connection (app switched, screen locked) can't lose the
    // answer: the client polls GET /api/agent?id=… until it is done.
    const run = await insertGeneration({
      user_id: caller.userId,
      model_id: AGENT_RUN,
      endpoint_id: "agent",
      kind: "agent",
      source: "agent-run",
      status: "IN_PROGRESS",
      input: { llm, effort, approval: opts.approval, media: media ?? null },
    } as never);
    after(async () => {
      try {
        const result = await runAgent(caller, history, opts);
        await finishGeneration(run.id, { status: "COMPLETED", output: result, media_url: null, cost: 0, error: null, charge: false });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        await finishGeneration(run.id, { status: "FAILED", output: null, media_url: null, cost: 0, error, charge: false }).catch(() => {});
      }
    });
    return Response.json({ run_id: run.id, status: "IN_PROGRESS" }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
