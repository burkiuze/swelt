import "server-only";
import type { Caller } from "./auth";
import { catalogForAgent, getModel } from "./catalog";
import { runAndWait, type JobView } from "./jobs";
import type { Effort, LlmKey } from "./llm";

export function llmSlug(key: LlmKey) {
  if (key === "sol") return process.env.OPENROUTER_MODEL_SOL || "openai/gpt-6.1-sol";
  return process.env.OPENROUTER_MODEL_OPUS || "anthropic/claude-opus-5.5";
}

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type Proposal = { model_id: string; input: Record<string, unknown>; reason?: string };
export type Step = { label: string; ms: number; kind: "think" | "tool"; detail?: unknown };
export type AgentResult = { reply: string; jobs: JobView[]; proposals: Proposal[]; model: string; steps: Step[]; ms: number; suggestion: string | null };

const TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_media",
      description:
        "Run one Vlipa image/video model on RunPod. Returns the request status and media URLs. Use output URLs from earlier calls as `image`/`images` inputs to chain steps (e.g. generate an image, then animate it).",
      parameters: {
        type: "object",
        properties: {
          model_id: { type: "string", description: "Exact model id from the catalog" },
          input: { type: "object", description: "Model inputs, keyed by the input names listed in the catalog", additionalProperties: true },
          reason: { type: "string", description: "One short sentence on why this model" },
        },
        required: ["model_id", "input"],
      },
    },
  },
];

function systemPrompt(approval: boolean) {
  return `You are the Vlipa Agent, a creative director inside Vlipa — a generative media platform (image + video models served from RunPod).
The user describes what they want; you pick the right model(s), write strong, detailed prompts, and call generate_media.
Guidelines:
- Prefer one well-chosen model per step. For several variations, make several calls (max 4 per turn).
- Text-to-image for new images; image-to-image models need "images" (array of URLs) or "image"; video models need "image" for image-to-video.
- Chain steps by passing previous output URLs. If the user attached image URLs, use them.
- Keep costs sensible: fast/cheap models for drafts, premium ones when quality is requested.
- After results arrive, reply briefly (2-4 sentences) in the user's language: what you made. Don't paste raw URLs; the UI shows media.
- If the user just chats (e.g. says hello), answer briefly without calling tools.
- End every final reply with one line "NEXT: <a short follow-up request the user could send next>" in the user's language.
${approval ? "- APPROVAL MODE IS ON: calls are not executed; they are shown to the user as proposals to approve. Explain your plan briefly." : ""}
Model catalog (inputs marked * are required):
${catalogForAgent()}`;
}

async function chat(model: string, messages: Msg[], effort: Effort) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://vlipa.dev",
      "X-Title": "Vlipa",
    },
    body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: "auto", reasoning: { effort }, max_tokens: 4000 }),
    signal: AbortSignal.timeout(120_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`OpenRouter (${model}): ${json?.error?.message || res.status}`);
  const msg = json?.choices?.[0]?.message;
  if (!msg) throw new Error(`OpenRouter (${model}) returned no message`);
  return msg as { content: string | null; tool_calls?: ToolCall[] };
}

export async function runAgent(
  caller: Caller,
  history: ChatTurn[],
  opts: { llm: LlmKey; effort: Effort; approval: boolean },
): Promise<AgentResult> {
  const model = llmSlug(opts.llm);
  const messages: Msg[] = [{ role: "system", content: systemPrompt(opts.approval) }, ...history.slice(-20)];
  const jobs: JobView[] = [];
  const proposals: Proposal[] = [];
  const steps: Step[] = [];
  const started = Date.now();
  const label = opts.llm === "sol" ? "GPT-6.1 Sol" : "Opus 5.5";
  const done = (reply: string): AgentResult => {
    const m = reply.match(/\n?\s*NEXT:\s*(.+)\s*$/i);
    return { reply: (m ? reply.slice(0, m.index) : reply).trim(), jobs, proposals, model, steps, ms: Date.now() - started, suggestion: m ? m[1].trim() : null };
  };
  const BUDGET = 270_000;

  for (let step = 0; step < 6; step++) {
    const t0 = Date.now();
    const msg = await chat(model, messages, opts.effort);
    const calls = msg.tool_calls ?? [];
    steps.push({ label: step === 0 ? `Planning with ${label}` : `Reviewing results with ${label}`, ms: Date.now() - t0, kind: "think", detail: calls.length ? calls.map((c) => c.function.name + " " + c.function.arguments) : undefined });
    if (!calls.length) return done(typeof msg.content === "string" ? msg.content : "");
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });

    const results = await Promise.all(
      calls.slice(0, 4).map(async (c) => {
        let args: Proposal;
        try {
          args = JSON.parse(c.function.arguments || "{}");
        } catch {
          return { id: c.id, content: JSON.stringify({ error: "Invalid JSON arguments" }) };
        }
        if (c.function.name !== "generate_media" || !getModel(args.model_id)) {
          return { id: c.id, content: JSON.stringify({ error: `Unknown tool or model: ${args.model_id}` }) };
        }
        if (opts.approval) {
          proposals.push({ model_id: args.model_id, input: args.input || {}, reason: args.reason });
          return { id: c.id, content: JSON.stringify({ status: "PROPOSED", note: "Shown to the user for approval; not executed." }) };
        }
        const remaining = Math.max(15_000, BUDGET - (Date.now() - started) - 30_000);
        const t1 = Date.now();
        try {
          const v = await runAndWait(caller, args.model_id, args.input || {}, Math.min(remaining, 200_000));
          jobs.push(v);
          steps.push({ label: `Calling ${getModel(args.model_id)?.name ?? args.model_id}`, ms: Date.now() - t1, kind: "tool", detail: { input: args.input, status: v.status, media: v.media, error: v.error } });
          return {
            id: c.id,
            content: JSON.stringify({ request_id: v.request_id, status: v.status, media: v.media, error: v.error, note: v.status === "COMPLETED" || v.status === "FAILED" ? undefined : "Still running; the UI will keep polling it." }),
          };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          steps.push({ label: `Calling ${getModel(args.model_id)?.name ?? args.model_id}`, ms: Date.now() - t1, kind: "tool", detail: { input: args.input, error } });
          return { id: c.id, content: JSON.stringify({ error }) };
        }
      }),
    );
    for (const r of results) messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
    for (const c of calls.slice(4)) messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: "Skipped: max 4 calls per turn" }) });
    if (opts.approval || Date.now() - started > BUDGET) break;
  }

  // Ask for a final summary without tools.
  try {
    const key = process.env.OPENROUTER_API_KEY!;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Vlipa" },
      body: JSON.stringify({ model, messages, max_tokens: 800, tools: TOOLS, tool_choice: "none" }),
      signal: AbortSignal.timeout(60_000),
    });
    const json = await res.json();
    const c = json?.choices?.[0]?.message?.content;
    return done(typeof c === "string" ? c : "");
  } catch {
    return done("");
  }
}
