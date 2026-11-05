import "server-only";
import { randomUUID } from "node:crypto";
import type { Caller } from "./auth";
import { getModel, type Model } from "./catalog";
import { dbEnabled, finishGeneration, getGeneration, insertGeneration, setJob, type Generation } from "./db";
import { buildInput, extractCost, extractMedia, isFinal, status as rpStatus, submit } from "./runpod";
import { persistMedia } from "./storage";

export type JobView = {
  request_id: string;
  model_id: string;
  status: string;
  media: string[];
  media_url: string | null;
  kind: "image" | "video";
  cost: number;
  error: string | null;
  output?: unknown;
  created_at?: string;
};

// Fallback state when Supabase isn't configured (single-instance only; good for local dev).
const memory = new Map<string, Generation>();

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function startJob(caller: Caller, modelId: string, values: Record<string, unknown>, source: string): Promise<JobView> {
  const model = getModel(modelId);
  if (!model) throw new HttpError(404, `Unknown model: ${modelId}`);
  const input = buildInput(model, values);

  if (!caller.isAdmin && caller.profile && Number(caller.profile.credits) < model.price) {
    throw new HttpError(402, `Not enough credits: this run costs about $${model.price.toFixed(3)} and your balance is $${Number(caller.profile.credits).toFixed(3)}.`);
  }

  let gen: Generation;
  const base = { user_id: caller.userId, model_id: model.id, endpoint_id: model.endpoints[0], kind: model.kind, source, status: "IN_QUEUE", input };
  if (dbEnabled()) gen = await insertGeneration(base);
  else {
    gen = { ...base, id: randomUUID(), runpod_job_id: null, output: null, media_url: null, cost: 0, error: null, created_at: new Date().toISOString(), completed_at: null } as Generation;
    memory.set(gen.id, gen);
  }

  try {
    const { endpoint, job } = await submit(model, input);
    gen = { ...gen, endpoint_id: endpoint, runpod_job_id: job.id, status: job.status || "IN_QUEUE" };
    if (dbEnabled()) await setJob(gen.id, `${endpoint}:${job.id}`, gen.status);
    else memory.set(gen.id, gen);
    return view(gen, model);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const done = await finish(gen, { status: "FAILED", output: null, media: [], cost: 0, error, charge: false });
    return view(done, model);
  }
}

export async function pollJob(caller: Caller, id: string): Promise<JobView> {
  let gen = dbEnabled() ? await getGeneration(caller.userId, id) : memory.get(id) ?? null;
  if (!gen || gen.user_id !== caller.userId) throw new HttpError(404, "Request not found");
  const model = getModel(gen.model_id);
  if (!model) throw new HttpError(404, "Model no longer exists");
  if (isFinal(gen.status) || !gen.runpod_job_id) return view(gen, model);

  // runpod_job_id is stored as "<endpoint>:<job id>"
  const [endpoint, jobId] = gen.runpod_job_id.includes(":") ? gen.runpod_job_id.split(/:(.+)/) : [gen.endpoint_id, gen.runpod_job_id];
  const job = await rpStatus(endpoint, jobId);
  if (!isFinal(job.status)) {
    gen = { ...gen, status: job.status };
    return view(gen, model);
  }
  if (job.status === "COMPLETED") {
    let media = extractMedia(job.output);
    media = await Promise.all(media.map((u, i) => persistMedia(u, `${gen!.id}-${i}`, model.kind)));
    const cost = extractCost(job.output) ?? model.price;
    const error = media.length ? null : "Model finished but returned no media";
    gen = await finish(gen, { status: media.length ? "COMPLETED" : "FAILED", output: job.output, media, cost, error, charge: !caller.isAdmin });
  } else {
    gen = await finish(gen, { status: job.status === "TIMED_OUT" || job.status === "CANCELLED" ? "FAILED" : job.status, output: job.output ?? null, media: [], cost: 0, error: job.error || job.status, charge: false });
  }
  return view(gen, model);
}

/** Submit and wait (up to `timeoutMs`) — used by the agent. */
export async function runAndWait(caller: Caller, modelId: string, values: Record<string, unknown>, timeoutMs: number, source = "agent") {
  let v = await startJob(caller, modelId, values, source);
  const until = Date.now() + timeoutMs;
  while (!isFinal(v.status) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 2500));
    v = await pollJob(caller, v.request_id);
  }
  return v;
}

async function finish(gen: Generation, a: { status: string; output: unknown; media: string[]; cost: number; error: string | null; charge: boolean }) {
  const output = a.media.length ? { ...(typeof a.output === "object" && a.output ? a.output : { raw: a.output }), swelt_media: a.media } : a.output;
  if (dbEnabled()) return finishGeneration(gen.id, { status: a.status, output, media_url: a.media[0] ?? null, cost: a.status === "COMPLETED" ? a.cost : 0, error: a.error, charge: a.charge && a.status === "COMPLETED" });
  const g = { ...gen, status: a.status, output, media_url: a.media[0] ?? null, cost: a.cost, error: a.error, completed_at: new Date().toISOString() };
  memory.set(g.id, g);
  return g;
}

export function mediaOf(gen: Pick<Generation, "output" | "media_url">): string[] {
  const o = gen.output as { swelt_media?: string[] } | null;
  if (o && Array.isArray(o.swelt_media)) return o.swelt_media;
  return gen.media_url ? [gen.media_url] : [];
}

export function view(gen: Generation, model?: Model): JobView {
  return {
    request_id: gen.id,
    model_id: gen.model_id,
    status: gen.status,
    media: mediaOf(gen),
    media_url: gen.media_url,
    kind: model?.kind ?? gen.kind,
    cost: Number(gen.cost || 0),
    error: gen.error,
    output: gen.output,
    created_at: gen.created_at,
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : String(e);
  const status = /Missing required input/.test(msg) ? 400 : 500;
  return Response.json({ error: msg }, { status });
}
