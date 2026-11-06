import "server-only";
import type { Model } from "./catalog";
import type { RunpodJob, RunpodStatus } from "./runpod";
import { putBytes, storageEnabled } from "./storage";

// OpenRouter media APIs:
//   POST /api/v1/images                → { data: [{ b64_json, media_type }], usage: { cost } }   (synchronous)
//   POST /api/v1/videos                → { id, status, polling_url }                              (async job)
//   GET  /api/v1/videos/{id}           → { status, unsigned_urls?, usage?, error? }
//   GET  /api/v1/videos/{id}/content   → video bytes (needs the API key)
//   GET  /api/v1/images/models, /api/v1/videos/models → live model lists (used to resolve slugs)

const BASE = "https://openrouter.ai/api/v1";

/**
 * OpenRouter provider routing: send each request to the cheapest provider serving the model
 * ("price"; set OPENROUTER_PROVIDER_SORT=throughput or latency to favour speed), falling back
 * to the next provider if one fails.
 */
export function providerPrefs() {
  const sort = process.env.OPENROUTER_PROVIDER_SORT || "price";
  return { sort, allow_fallbacks: true };
}
export const OR_PREFIX = "openrouter/";

function headers(extra: Record<string, string> = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://vlipa.dev",
    "X-Title": "Vlipa",
    ...extra,
  };
}

async function call(path: string, init?: RequestInit, timeout = 120_000) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers(), cache: "no-store", signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { ok: res.ok, status: res.status, json };
}

function describe(j: Record<string, unknown> | null, status: number) {
  if (!j) return `HTTP ${status}`;
  const e = j.error as { message?: string } | string | undefined;
  if (typeof e === "string") return e;
  if (e?.message) return e.message;
  for (const k of ["message", "detail", "raw"]) if (typeof j[k] === "string") return j[k] as string;
  return JSON.stringify(j).slice(0, 400);
}

type OrModel = { id: string; name?: string };
const lists: Record<string, { at: number; items: OrModel[] }> = {};

async function listModels(kind: "images" | "videos" | "speech"): Promise<OrModel[]> {
  const c = lists[kind];
  if (c && Date.now() - c.at < 600_000) return c.items;
  const r = await call(kind === "speech" ? "/models?output_modalities=speech" : `/${kind}/models`, undefined, 30_000);
  const items = (Array.isArray(r.json?.data) ? r.json!.data : []) as OrModel[];
  lists[kind] = { at: Date.now(), items: items.filter((m) => typeof m?.id === "string") };
  return lists[kind].items;
}

const norm = (s: string) => s.toLowerCase().replace(/^[^:]*:\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();

/** OPENROUTER_MEDIA_OVERRIDES env → exact live slug → model whose display name matches → our best-known slug. */
export async function resolveOrSlug(model: Model): Promise<string> {
  try {
    const o = JSON.parse(process.env.OPENROUTER_MEDIA_OVERRIDES || "{}")[model.id];
    if (typeof o === "string" && o) return o;
  } catch {}
  const fallback = model.orSlug || model.id;
  try {
    const items = await listModels(model.kind === "video" ? "videos" : model.kind === "audio" ? "speech" : "images");
    if (items.some((m) => m.id === fallback)) return fallback;
    const want = norm(model.orName || model.name);
    const hit = items.find((m) => m.name && norm(m.name) === want) ?? items.find((m) => norm(m.id.split("/")[1] ?? "") === want);
    if (hit) return hit.id;
  } catch {}
  return fallback;
}

const asUrls = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).filter((u): u is string => typeof u === "string" && u.length > 0);

/** Synchronous image generation; returns stored media URLs and the reported cost. */
export async function orImage(model: Model, input: Record<string, unknown>, name: string) {
  const slug = await resolveOrSlug(model);
  const refs = asUrls(input.images ?? input.image);
  const body: Record<string, unknown> = { model: slug, prompt: input.prompt, provider: providerPrefs() };
  if (input.aspect_ratio) body.aspect_ratio = input.aspect_ratio;
  if (input.resolution) body.resolution = input.resolution;
  if (refs.length) body.input_references = refs.map((url) => ({ type: "image_url", image_url: { url } }));
  const r = await call("/images", { method: "POST", body: JSON.stringify(body) }, 240_000);
  if (!r.ok) throw new Error(`OpenRouter (${slug}): ${describe(r.json, r.status)}`);
  const data = (Array.isArray(r.json?.data) ? r.json!.data : []) as { b64_json?: string; url?: string; media_type?: string }[];
  const media: string[] = [];
  for (const [i, d] of data.entries()) {
    if (d.b64_json) {
      const type = d.media_type || "image/png";
      const dataUrl = `data:${type};base64,${d.b64_json}`;
      if (storageEnabled()) media.push(await putBytes(`outputs/${name}-${i}.${type.split("/")[1]?.replace("jpeg", "jpg") || "png"}`, Buffer.from(d.b64_json, "base64"), type));
      else media.push(dataUrl);
    } else if (d.url) media.push(d.url);
  }
  const cost = Number((r.json?.usage as { cost?: number } | undefined)?.cost);
  return { slug, media, cost: Number.isFinite(cost) && cost > 0 ? cost : null, output: { model: slug, usage: r.json?.usage ?? null, count: media.length } };
}

export async function orVideoSubmit(model: Model, input: Record<string, unknown>) {
  const slug = await resolveOrSlug(model);
  const body: Record<string, unknown> = { model: slug, prompt: input.prompt, provider: providerPrefs() };
  if (input.duration) body.duration = Number(input.duration);
  if (input.aspect_ratio) body.aspect_ratio = input.aspect_ratio;
  if (input.resolution) body.resolution = input.resolution;
  const first = asUrls(input.image ?? input.image_url)[0];
  if (first) body.frame_images = [{ type: "image_url", image_url: { url: first }, frame_type: "first_frame" }];
  const video = asUrls(input.video)[0];
  if (video) body.input_references = [{ type: "video_url", video_url: { url: video } }];
  const r = await call("/videos", { method: "POST", body: JSON.stringify(body) });
  const id = r.json?.id;
  if (!r.ok || typeof id !== "string") throw new Error(`OpenRouter (${slug}): ${describe(r.json, r.status)}`);
  return { endpoint: `${OR_PREFIX}${slug}`, job: { id, status: mapStatus(String(r.json?.status ?? "pending")) } as RunpodJob };
}

function mapStatus(s: string): RunpodStatus {
  switch (s.toLowerCase()) {
    case "completed":
    case "succeeded":
    case "success":
      return "COMPLETED";
    case "failed":
    case "error":
    case "rejected":
      return "FAILED";
    case "cancelled":
    case "canceled":
    case "expired":
      return "CANCELLED";
    case "in_progress":
    case "processing":
    case "running":
    case "generating":
      return "IN_PROGRESS";
    default:
      return "IN_QUEUE";
  }
}

export async function orVideoStatus(id: string): Promise<RunpodJob> {
  const r = await call(`/videos/${encodeURIComponent(id)}`, undefined, 30_000);
  if (!r.ok || !r.json) throw new Error(`OpenRouter video status: ${describe(r.json, r.status)}`);
  const status = mapStatus(String(r.json.status ?? ""));
  return { id, status, output: r.json, error: status === "FAILED" ? describe(r.json, r.status) : undefined };
}

/** Download the finished clip (the URLs need our key) and store it; returns public URLs. */
export async function orVideoMedia(id: string, output: unknown, name: string): Promise<string[]> {
  const o = (output ?? {}) as { unsigned_urls?: string[] };
  const count = Math.max(1, Array.isArray(o.unsigned_urls) ? o.unsigned_urls.length : 1);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${BASE}/videos/${encodeURIComponent(id)}/content?index=${i}`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) break;
    const type = res.headers.get("content-type")?.split(";")[0] || "video/mp4";
    const buf = Buffer.from(await res.arrayBuffer());
    out.push(storageEnabled() ? await putBytes(`outputs/${name}-${i}.mp4`, buf, type) : `data:${type};base64,${buf.toString("base64")}`);
  }
  return out;
}

export function orCost(output: unknown): number | null {
  const c = Number(((output ?? {}) as { usage?: { cost?: number } }).usage?.cost);
  return Number.isFinite(c) && c > 0 ? c : null;
}

/**
 * Text-to-speech (OpenAI-compatible /audio/speech). The response is raw audio, so the cost is read
 * from the generation record when OpenRouter exposes one, else estimated from the text length.
 */
export async function orSpeech(model: Model, input: Record<string, unknown>, name: string) {
  const slug = await resolveOrSlug(model);
  const text = String(input.prompt ?? "").slice(0, 20_000);
  if (!text.trim()) throw new Error("Type some text to speak.");
  const body: Record<string, unknown> = { model: slug, input: text, response_format: "mp3", provider: providerPrefs() };
  if (typeof input.voice === "string" && input.voice.trim()) body.voice = input.voice.trim();
  const res = await fetch(`${BASE}/audio/speech`, { method: "POST", headers: headers(), body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(240_000) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let j: Record<string, unknown> | null = null;
    try {
      j = JSON.parse(t);
    } catch {}
    throw new Error(`OpenRouter (${slug}): ${j ? describe(j, res.status) : t.slice(0, 300) || `HTTP ${res.status}`}`);
  }
  const type = res.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("The voice model returned no audio.");
  const ext = type.includes("wav") ? "wav" : type.includes("pcm") ? "pcm" : "mp3";
  const url = storageEnabled() ? await putBytes(`outputs/${name}.${ext}`, buf, type.startsWith("audio/") ? type : "audio/mpeg") : `data:${type};base64,${buf.toString("base64")}`;

  let cost: number | null = null;
  const genId = res.headers.get("x-generation-id") || res.headers.get("openrouter-generation-id");
  if (genId) {
    for (let i = 0; i < 2 && cost == null; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const g = await call(`/generation?id=${encodeURIComponent(genId)}`, undefined, 15_000).catch(() => null);
      const c = Number((g?.json?.data as { total_cost?: number } | undefined)?.total_cost);
      if (Number.isFinite(c) && c > 0) cost = c;
    }
  }
  return { slug, media: [url], cost, chars: text.length, output: { model: slug, chars: text.length, generation_id: genId, cost } };
}
