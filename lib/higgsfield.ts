import "server-only";
import type { Model } from "./catalog";
import type { RunpodJob, RunpodStatus } from "./runpod";

// Higgsfield public API (platform.higgsfield.ai):
//   POST /{model-slug}            → { request_id, status }
//   GET  /requests/{id}/status    → { status: queued|in_progress|completed|failed|nsfw, images:[{url}], video:{url} }
//   GET  /models                  → { items: [{ slug, name, operation_type, ... }] }
// Auth: "Authorization: Key <key id>:<key secret>" (HIGGSFIELD_API_KEY holds "id:secret").

const BASE = () => (process.env.HIGGSFIELD_BASE_URL || "https://platform.higgsfield.ai").replace(/\/$/, "");
export const HF_PREFIX = "higgsfield/";

export const higgsfieldEnabled = () => Boolean(process.env.HIGGSFIELD_API_KEY);

async function hf(path: string, init?: RequestInit) {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error("HIGGSFIELD_API_KEY is not configured");
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json };
}

function describe(j: Record<string, unknown> | null, status: number) {
  if (!j) return `HTTP ${status}`;
  for (const k of ["detail", "error", "message", "raw"]) {
    const v = j[k];
    if (typeof v === "string") return v;
    if (v) return JSON.stringify(v).slice(0, 400);
  }
  return JSON.stringify(j).slice(0, 400);
}

type HfModel = { slug: string; name?: string; [k: string]: unknown };
let cache: { at: number; items: HfModel[] } | null = null;

/** Higgsfield's live model list (cached 10 minutes). */
export async function listHiggsfieldModels(): Promise<HfModel[]> {
  if (cache && Date.now() - cache.at < 600_000) return cache.items;
  const r = await hf("/models");
  if (!r.ok) throw new Error(`Higgsfield /models: ${describe(r.json, r.status)}`);
  const items = (Array.isArray(r.json?.items) ? r.json!.items : Array.isArray(r.json) ? r.json : []) as HfModel[];
  cache = { at: Date.now(), items: items.filter((m) => m && typeof m.slug === "string") };
  return cache.items;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ");

/**
 * Resolve a catalog model to a Higgsfield slug: an env override
 * (HIGGSFIELD_SLUG_OVERRIDES='{"higgsfield/kling-4.0":"kling-video/v4/..."}'), else the first
 * live model whose slug + name contain every keyword in `model.match`.
 */
export async function resolveSlug(model: Model, input: Record<string, unknown> = {}): Promise<string> {
  const hasImage = ["image_url", "image", "start_image", "images", "image_references"].some((k) => {
    const v = input[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  try {
    const o = JSON.parse(process.env.HIGGSFIELD_SLUG_OVERRIDES || "{}")[model.id];
    if (typeof o === "string" && o) return o;
  } catch {}
  if (hasImage && model.hfSlugWithImage) return model.hfSlugWithImage;
  if (model.hfSlug) return model.hfSlug;
  const words = (model.match ?? []).map(norm);
  const items = await listHiggsfieldModels();
  const hit = items.find((m) => {
    const hay = ` ${norm(`${m.slug} ${m.name ?? ""} ${m.title ?? ""}`)} `;
    return words.every((w) => hay.includes(` ${w} `) || hay.includes(w));
  });
  if (!hit) throw new Error(`No Higgsfield model matches ${model.id} (${words.join(", ")}). Set HIGGSFIELD_SLUG_OVERRIDES.`);
  return hit.slug;
}

export async function hfSubmit(model: Model, input: Record<string, unknown>) {
  const slug = await resolveSlug(model, input);
  const r = await hf(`/${slug.replace(/^\//, "")}`, { method: "POST", body: JSON.stringify(input) });
  const id = r.json?.request_id ?? r.json?.id;
  if (!r.ok || typeof id !== "string") throw new Error(`Higgsfield (${slug}): ${describe(r.json, r.status)}`);
  return { endpoint: `${HF_PREFIX}${slug}`, job: { id, status: mapStatus(String(r.json?.status ?? "queued")) } as RunpodJob };
}

function mapStatus(s: string): RunpodStatus {
  switch (s.toLowerCase()) {
    case "completed":
    case "succeeded":
      return "COMPLETED";
    case "failed":
    case "nsfw":
    case "error":
      return "FAILED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    case "in_progress":
    case "processing":
    case "running":
      return "IN_PROGRESS";
    default:
      return "IN_QUEUE";
  }
}

export async function hfStatus(requestId: string): Promise<RunpodJob> {
  const r = await hf(`/requests/${encodeURIComponent(requestId)}/status`);
  if (!r.ok || !r.json) throw new Error(`Higgsfield status: ${describe(r.json, r.status)}`);
  const raw = String(r.json.status ?? "");
  const status = mapStatus(raw);
  return {
    id: requestId,
    status,
    output: r.json,
    error: status === "FAILED" ? (raw === "nsfw" ? "Blocked by Higgsfield's content filter (nsfw)" : describe(r.json, r.status)) : undefined,
  };
}

/** Media URLs from a completed Higgsfield status payload (images[].url, video.url). */
export function hfMedia(output: unknown): string[] {
  const o = (output ?? {}) as { images?: { url?: string }[]; video?: { url?: string }; videos?: { url?: string }[] };
  const urls = [...(o.images ?? []).map((i) => i?.url), o.video?.url, ...(o.videos ?? []).map((v) => v?.url)];
  return urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
}
