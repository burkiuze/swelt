import "server-only";
import type { Field, Model } from "./catalog";

const BASE = "https://api.runpod.ai/v2";

function key() {
  const k = process.env.RUNPOD_API_KEY;
  if (!k) throw new Error("RUNPOD_API_KEY is not configured");
  return k;
}

function overrides(): Record<string, string> {
  try {
    return JSON.parse(process.env.RUNPOD_ENDPOINT_OVERRIDES || "{}");
  } catch {
    return {};
  }
}

// Endpoint IDs that RunPod accepted, cached per server instance.
const resolved = new Map<string, string>();

export function candidateEndpoints(model: Model): string[] {
  const o = overrides()[model.id];
  const list = o ? [o, ...model.endpoints] : model.endpoints;
  const r = resolved.get(model.id);
  return r ? [r, ...list.filter((e) => e !== r)] : list;
}

export type RunpodStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT";

export type RunpodJob = {
  id: string;
  status: RunpodStatus;
  output?: unknown;
  error?: string;
  delayTime?: number;
  executionTime?: number;
};

async function rp(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json: json as Record<string, unknown> | null };
}

/** Build the RunPod `input` object from user values, dropping empty values and casting types. */
export function buildInput(model: Model, values: Record<string, unknown>) {
  const input: Record<string, unknown> = {};
  for (const f of model.fields) {
    let v = values[f.name];
    if (v === undefined || v === null || v === "") v = f.default;
    if (v === undefined || v === null || v === "") {
      if (f.required) throw new Error(`Missing required input: ${f.name}`);
      continue;
    }
    input[f.name] = cast(f, v);
  }
  // Pass through extra keys the caller sent explicitly (API users may know more params).
  for (const [k, v] of Object.entries(values)) {
    if (!(k in input) && v !== undefined && v !== null && v !== "" && !model.fields.some((f) => f.name === k)) input[k] = v;
  }
  if (input.seed === -1 || input.seed === "-1") delete input.seed;
  return input;
}

function cast(f: Field, v: unknown) {
  switch (f.type) {
    case "number":
    case "seed":
      return typeof v === "number" ? v : Number(v);
    case "boolean":
      return v === true || v === "true";
    case "images":
      return Array.isArray(v) ? v.filter(Boolean) : String(v).split(/\s*[\n,]\s*/).filter(Boolean);
    case "select":
      return f.options && typeof f.options[0] === "number" ? Number(v) : v;
    default:
      return v;
  }
}

/** Submit an async job; tries each candidate endpoint until RunPod accepts one. */
export async function submit(model: Model, input: Record<string, unknown>) {
  const errors: string[] = [];
  for (const endpoint of candidateEndpoints(model)) {
    const r = await rp(`/${endpoint}/run`, { method: "POST", body: JSON.stringify({ input }) });
    if (r.ok && r.json && typeof r.json.id === "string") {
      resolved.set(model.id, endpoint);
      return { endpoint, job: r.json as unknown as RunpodJob };
    }
    const msg = describe(r.json) || `HTTP ${r.status}`;
    errors.push(`${endpoint}: ${msg}`);
    // Only fall through to the next candidate when the endpoint itself is unknown.
    if (r.status !== 404 && !/not found|does not exist/i.test(msg)) break;
  }
  throw new Error(`RunPod rejected the request — ${errors.join(" | ")}`);
}

export async function status(endpoint: string, jobId: string) {
  const r = await rp(`/${endpoint}/status/${jobId}`);
  if (!r.ok || !r.json) throw new Error(`RunPod status failed: ${describe(r.json) || r.status}`);
  return r.json as unknown as RunpodJob;
}

export async function cancel(endpoint: string, jobId: string) {
  await rp(`/${endpoint}/cancel/${jobId}`, { method: "POST" });
}

export async function health(endpoint: string) {
  const r = await rp(`/${endpoint}/health`);
  return { status: r.status, body: r.json };
}

function describe(j: Record<string, unknown> | null) {
  if (!j) return "";
  for (const k of ["error", "message", "detail", "raw"]) if (typeof j[k] === "string") return j[k] as string;
  return JSON.stringify(j).slice(0, 300);
}

export const isFinal = (s: string) => ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(s);

const MEDIA_RE = /^(https?:\/\/|data:(image|video)\/)/i;

/** Pull every media URL out of an arbitrary RunPod output payload. */
export function extractMedia(output: unknown): string[] {
  const found: string[] = [];
  const visit = (v: unknown, keyName = "") => {
    if (typeof v === "string") {
      if (MEDIA_RE.test(v)) found.push(v);
      else if (/image|video|result|output|url/i.test(keyName) && /^[A-Za-z0-9+/=]{200,}$/.test(v)) found.push(`data:image/png;base64,${v}`);
    } else if (Array.isArray(v)) v.forEach((x) => visit(x, keyName));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, k);
  };
  visit(output);
  return Array.from(new Set(found));
}

export function extractCost(output: unknown): number | null {
  if (output && typeof output === "object" && "cost" in output) {
    const c = Number((output as { cost: unknown }).cost);
    return Number.isFinite(c) ? c : null;
  }
  return null;
}
