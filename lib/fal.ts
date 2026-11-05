import "server-only";
import { getModel, markup, type Category, type Field, type Model } from "./catalog";
import { creditsLabel } from "./credits";
import type { RunpodJob, RunpodStatus } from "./runpod";

// fal.ai — every active image/video model, loaded live from fal's platform API.
//   GET  https://api.fal.ai/v1/models?cursor=…                       → { models: [{ endpoint_id, metadata }], next_cursor, has_more }
//   GET  https://api.fal.ai/v1/models?endpoint_id=X&expand=openapi-3.0 → input schema
//   GET  https://api.fal.ai/v1/models/pricing?endpoint_id=…(≤50)     → { prices: [{ endpoint_id, unit_price, unit }] }
//   POST https://queue.fal.run/{endpoint}                           → { request_id }
//   GET  https://queue.fal.run/{app}/requests/{id}/status            → { status: IN_QUEUE | IN_PROGRESS | COMPLETED }
//   GET  https://queue.fal.run/{app}/requests/{id}                   → result ({ images: [{url}] } / { video: {url} } …)
// Auth: "Authorization: Key $FAL_KEY".

export const FAL_PREFIX = "fal/";
const API = "https://api.fal.ai/v1";
const QUEUE = "https://queue.fal.run";
const SUPPORTED: Category[] = ["text-to-image", "image-to-image", "text-to-video", "image-to-video", "video-to-video"];

export const falEnabled = () => Boolean(process.env.FAL_KEY);

function headers() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not configured");
  return { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json" };
}

async function api<T>(path: string, revalidate = 3600): Promise<T> {
  // Retry rate limits and transient errors with a short backoff.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: headers(), next: { revalidate }, signal: AbortSignal.timeout(30_000) });
    if (res.ok) return (await res.json()) as T;
    if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 800 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      continue;
    }
    throw new Error(`fal ${path.split("?")[0]}: HTTP ${res.status}`);
  }
}

/** Unit prices for up to 50 endpoints, following pagination. */
async function pricesFor(ids: string[]): Promise<FalPrice[]> {
  const out: FalPrice[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams();
    for (const id of ids) q.append("endpoint_id", id);
    if (cursor) q.set("cursor", cursor);
    const r = await api<{ prices?: FalPrice[]; next_cursor?: string | null; has_more?: boolean }>(`/models/pricing?${q}`);
    out.push(...(r.prices ?? []));
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  return out;
}

type FalMeta = {
  display_name?: string;
  category?: string;
  description?: string;
  status?: string;
  tags?: string[];
  thumbnail_url?: string;
  updated_at?: string;
  date?: string;
};
type FalListItem = { endpoint_id: string; metadata?: FalMeta; openapi?: unknown };
type FalPrice = { endpoint_id: string; unit_price: number; unit: string };

const GRADIENTS: [string, string, string][] = [
  ["#c4b5fd", "#4c1d95", "#1e1b4b"],
  ["#93c5fd", "#1d4ed8", "#0b1437"],
  ["#fbcfe8", "#be185d", "#1f0a14"],
  ["#bbf7d0", "#047857", "#022c22"],
  ["#fde68a", "#b45309", "#1c1917"],
];

/** Typical number of billing units in one run, for the up-front estimate. */
function unitsPerRun(unit: string, kind: "image" | "video") {
  const u = unit.toLowerCase();
  if (u.includes("second")) return 5;
  if (u.includes("minute")) return 5 / 60;
  if (u.includes("megapixel") || u.includes("image") || u.includes("video") || u.includes("request") || u.includes("generation")) return 1;
  return kind === "video" ? 5 : 1;
}

const pretty = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function baseFields(category: Category): Field[] {
  const f: Field[] = [{ name: "prompt", label: "Prompt", type: "textarea", required: category.startsWith("text") }];
  if (category === "image-to-image") f.push({ name: "image_url", label: "Image", type: "image", required: true });
  if (category === "image-to-video") f.push({ name: "image_url", label: "Start image", type: "image", required: true });
  if (category === "video-to-video") f.push({ name: "video_url", label: "Source video URL", type: "text", required: true });
  return f;
}

let listCache: { at: number; models: Model[] } | null = null;

/** All active fal image/video models with prices (cached for an hour). */
export async function listFalModels(): Promise<Model[]> {
  if (!falEnabled()) return [];
  if (listCache && Date.now() - listCache.at < 3_600_000) return listCache.models;
  const items: FalListItem[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 40; page++) {
    const q = new URLSearchParams({ limit: "100" });
    if (cursor) q.set("cursor", cursor);
    const r = await api<{ models?: FalListItem[]; next_cursor?: string | null; has_more?: boolean }>(`/models?${q}`);
    items.push(...(r.models ?? []));
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  const usable = items.filter((m) => {
    const st = (m.metadata?.status || "active").toLowerCase();
    return SUPPORTED.includes(m.metadata?.category as Category) && st !== "deprecated" && st !== "inactive";
  });

  const prices = new Map<string, FalPrice>();
  for (let i = 0; i < usable.length; i += 50) {
    try {
      for (const p of await pricesFor(usable.slice(i, i + 50).map((m) => m.endpoint_id))) prices.set(p.endpoint_id, p);
    } catch {
      // keep going; models without a price can't be run until it loads
    }
  }

  const models = usable.map((m) => toModel(m, prices.get(m.endpoint_id)));
  models.sort((a, b) => a.name.localeCompare(b.name));
  listCache = { at: Date.now(), models };
  return models;
}

function toModel(m: FalListItem, price: FalPrice | undefined, fields?: Field[]): Model {
  const meta = m.metadata ?? {};
  const category = meta.category as Category;
  const kind: "image" | "video" = category.endsWith("video") ? "video" : "image";
  const unit = price?.unit || (kind === "video" ? "second" : "image");
  const unitPrice = price ? markup(Number(price.unit_price)) : undefined;
  const runPrice = unitPrice != null ? Math.round(unitPrice * unitsPerRun(unit, kind) * 10000) / 10000 : kind === "video" ? 1 : 0.06;
  const hash = [...m.endpoint_id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  return {
    id: `${FAL_PREFIX}${m.endpoint_id}`,
    name: meta.display_name || pretty(m.endpoint_id.split("/").slice(1).join(" ")),
    lab: "fal",
    description: (meta.description || "").replace(/\s+/g, " ").trim().slice(0, 240) || `${pretty(category)} model on fal.`,
    category,
    kind,
    tags: (meta.tags ?? []).slice(0, 3),
    provider: "fal",
    falEndpoint: m.endpoint_id,
    falUnit: unit,
    falUnitPrice: unitPrice,
    thumbnail: meta.thumbnail_url,
    endpoints: [],
    fields: fields ?? baseFields(category),
    price: runPrice,
    priceLabel: unitPrice != null ? `${creditsLabel(unitPrice)} / ${unit}` : "price pending",
    gradient: GRADIENTS[hash % GRADIENTS.length],
  };
}

/* ---------------- input schema → form fields ---------------- */

type Schema = {
  type?: string;
  enum?: (string | number)[];
  default?: unknown;
  description?: string;
  title?: string;
  minimum?: number;
  maximum?: number;
  items?: Schema;
  anyOf?: Schema[];
  allOf?: Schema[];
  $ref?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  "x-fal-order-properties"?: string[];
};

const MAIN = new Set(["prompt", "image_url", "image_urls", "video_url", "aspect_ratio", "image_size", "duration", "resolution", "num_images", "start_image_url", "end_image_url"]);

function resolve(s: Schema | undefined, root: { components?: { schemas?: Record<string, Schema> } }): Schema | undefined {
  if (!s) return s;
  if (s.$ref) return resolve(root.components?.schemas?.[s.$ref.split("/").pop() || ""], root);
  if (s.allOf?.length === 1) return resolve(s.allOf[0], root);
  if (s.anyOf?.length) {
    const nonNull = s.anyOf.filter((x) => x.type !== "null");
    if (nonNull.length === 1) return { ...resolve(nonNull[0], root), default: s.default ?? nonNull[0].default, description: s.description ?? nonNull[0].description };
  }
  return s;
}

function toField(name: string, raw: Schema, required: boolean, root: Parameters<typeof resolve>[1]): Field | null {
  const s = resolve(raw, root);
  if (!s) return null;
  const label = s.title || pretty(name);
  const help = s.description?.slice(0, 160);
  const advanced = !required && !MAIN.has(name);
  const base = { name, label, required, advanced, help };
  if (s.enum?.length) return { ...base, type: "select", options: s.enum, default: (s.default as string | number) ?? s.enum[0] };
  if (/image_urls$|reference_image_urls$/.test(name) || (s.type === "array" && /image/.test(name) && resolve(s.items, root)?.type === "string")) {
    return { ...base, type: "images", max: 10 };
  }
  if (/(^|_)image_url$|^image$/.test(name) && (s.type === "string" || !s.type)) return { ...base, type: "image" };
  if (name === "seed") return { ...base, type: "seed", default: -1, advanced: true };
  if (s.type === "integer" || s.type === "number") {
    return { ...base, type: "number", default: s.default as number, min: s.minimum, max: s.maximum, step: s.type === "integer" ? 1 : undefined };
  }
  if (s.type === "boolean") return { ...base, type: "boolean", default: (s.default as boolean) ?? false };
  if (s.type === "string") return { ...base, type: /prompt/.test(name) ? "textarea" : "text", default: (s.default as string) ?? undefined };
  return required ? { ...base, type: "text" } : null; // objects/arrays we can't render
}

function fieldsFromOpenApi(openapi: unknown, endpoint: string): Field[] | null {
  const root = openapi as { paths?: Record<string, { post?: { requestBody?: { content?: Record<string, { schema?: Schema }> } } }>; components?: { schemas?: Record<string, Schema> } };
  if (!root?.paths) return null;
  const post = root.paths[`/${endpoint}`]?.post ?? Object.values(root.paths).find((p) => p.post?.requestBody)?.post;
  const input = resolve(post?.requestBody?.content?.["application/json"]?.schema, root);
  if (!input?.properties) return null;
  const required = new Set(input.required ?? []);
  const order = input["x-fal-order-properties"] ?? Object.keys(input.properties);
  const fields: Field[] = [];
  for (const name of order) {
    const prop = input.properties[name];
    if (!prop || name === "sync_mode" || name === "enable_safety_checker") continue;
    const f = toField(name, prop, required.has(name), root);
    if (f) fields.push(f);
  }
  return fields.length ? fields : null;
}

const schemaCache = new Map<string, { at: number; model: Model }>();

/** One fal model with its real input fields (schema cached for an hour). */
export async function getFalModel(id: string): Promise<Model | undefined> {
  if (!id.startsWith(FAL_PREFIX) || !falEnabled()) return undefined;
  const hit = schemaCache.get(id);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.model;
  const endpoint = id.slice(FAL_PREFIX.length);
  const listed = (await listFalModels().catch(() => [] as Model[])).find((m) => m.id === id);
  try {
    const r = await api<{ models?: FalListItem[] }>(`/models?${new URLSearchParams({ endpoint_id: endpoint, expand: "openapi-3.0" })}`);
    const item = r.models?.[0];
    if (!item || !SUPPORTED.includes(item.metadata?.category as Category)) return listed;
    const fields = fieldsFromOpenApi(item.openapi, endpoint) ?? undefined;
    const price = listed?.falUnitPrice != null ? undefined : (await pricesFor([endpoint]).catch(() => [] as FalPrice[]))[0];
    const model = listed && !price ? { ...listed, fields: fields ?? listed.fields } : toModel(item, price, fields);
    schemaCache.set(id, { at: Date.now(), model });
    return model;
  } catch {
    return listed;
  }
}

/** Catalog model or fal model. */
export async function getAnyModel(id: string): Promise<Model | undefined> {
  return getModel(id) ?? (id.startsWith(FAL_PREFIX) ? getFalModel(id) : undefined);
}

/* ---------------- queue ---------------- */

const appOf = (endpoint: string) => endpoint.split("/").slice(0, 2).join("/");

/** Map generic attachment inputs ("images") onto the model's own field names. */
export function falInput(model: Model, input: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...input };
  const names = new Set(model.fields.map((f) => f.name));
  const imgs = Array.isArray(out.images) ? (out.images as string[]) : typeof out.image === "string" ? [out.image as string] : [];
  if (imgs.length) {
    if (names.has("image_urls") && !out.image_urls) out.image_urls = imgs;
    if (names.has("image_url") && !out.image_url) out.image_url = imgs[0];
    if (names.has("start_image_url") && !out.start_image_url) out.start_image_url = imgs[0];
    if (!names.has("images")) delete out.images;
    if (!names.has("image")) delete out.image;
  }
  if (out.seed === -1 || out.seed === "-1") delete out.seed;
  return out;
}

export async function falSubmit(model: Model, input: Record<string, unknown>) {
  const endpoint = model.falEndpoint!;
  // Never run a model we can't price: we'd have no idea what to charge.
  if (model.falUnitPrice == null) throw new Error(`${model.name}: price not available from fal right now. Please try again later or pick another model.`);
  const res = await fetch(`${QUEUE}/${endpoint}`, { method: "POST", headers: headers(), body: JSON.stringify(falInput(model, input)), cache: "no-store", signal: AbortSignal.timeout(60_000) });
  const j = (await res.json().catch(() => ({}))) as { request_id?: string; detail?: unknown; status?: string };
  if (!res.ok || !j.request_id) throw new Error(`fal (${endpoint}): ${describe(j, res.status)}`);
  return { endpoint: `${FAL_PREFIX}${endpoint}`, job: { id: j.request_id, status: "IN_QUEUE" } as RunpodJob };
}

function describe(j: { detail?: unknown; error?: unknown; message?: unknown }, status: number) {
  const d = j?.detail ?? j?.error ?? j?.message;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x as { msg?: string; loc?: unknown[] }).msg ? `${(x as { loc?: unknown[] }).loc?.slice(-1)[0]}: ${(x as { msg: string }).msg}` : JSON.stringify(x)).join("; ").slice(0, 400);
  return d ? JSON.stringify(d).slice(0, 400) : `HTTP ${status}`;
}

export async function falStatus(endpoint: string, requestId: string): Promise<RunpodJob> {
  const app = appOf(endpoint);
  const res = await fetch(`${QUEUE}/${app}/requests/${encodeURIComponent(requestId)}/status`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const j = (await res.json().catch(() => ({}))) as { status?: string };
  if (!res.ok) throw new Error(`fal status: ${describe(j as never, res.status)}`);
  const s = String(j.status || "").toUpperCase();
  if (s !== "COMPLETED") return { id: requestId, status: (s === "IN_PROGRESS" ? "IN_PROGRESS" : "IN_QUEUE") as RunpodStatus };
  // Completed: fetch the result (an error result means the run failed).
  const r = await fetch(`${QUEUE}/${app}/requests/${encodeURIComponent(requestId)}`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(60_000) });
  const out = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) return { id: requestId, status: "FAILED", output: out, error: `fal: ${describe(out, r.status)}` };
  return { id: requestId, status: "COMPLETED", output: out };
}

/** Media URLs from a fal result. */
export function falMedia(output: unknown): string[] {
  const o = (output ?? {}) as Record<string, unknown>;
  const urls: unknown[] = [];
  const take = (v: unknown) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(take);
    else if (typeof v === "object" && typeof (v as { url?: unknown }).url === "string") urls.push((v as { url: string }).url);
  };
  for (const k of ["images", "image", "video", "videos", "output", "outputs"]) take(o[k]);
  return urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
}

/** Our charge for a finished fal run: unit price (margin included) × units used. */
export function falCost(model: Model, input: Record<string, unknown>, mediaCount: number): number {
  if (model.falUnitPrice == null) return model.price;
  const u = (model.falUnit || "").toLowerCase();
  let units = 1;
  if (u.includes("second")) units = Number(input.duration) || Number(String(input.duration || "").replace(/\D/g, "")) || 5;
  else if (u.includes("image") || u.includes("megapixel")) units = Math.max(1, mediaCount);
  return Math.round(model.falUnitPrice * units * 10000) / 10000;
}
