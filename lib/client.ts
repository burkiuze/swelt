"use client";

export type JobView = {
  request_id: string;
  model_id: string;
  status: string;
  media: string[];
  media_url: string | null;
  kind: "image" | "video" | "audio";
  cost: number;
  error: string | null;
  output?: unknown;
  created_at?: string;
};

export const FINAL = ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"];

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(data && "request_id" in data)) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

export async function startRun(model: string, input: Record<string, unknown>, source = "playground") {
  return json<JobView>(await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, input, source }) }));
}

export async function pollRun(id: string) {
  return json<JobView>(await fetch(`/api/requests/${id}`, { cache: "no-store" }));
}

/** Poll until the job reaches a final state, reporting progress. */
export async function waitFor(job: JobView, onUpdate: (j: JobView) => void, signal?: { cancelled: boolean }) {
  let j = job;
  let delay = 1500;
  while (!FINAL.includes(j.status) && !signal?.cancelled) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(5000, delay + 500);
    try {
      j = await pollRun(j.request_id);
      onUpdate(j);
    } catch (e) {
      onUpdate({ ...j, status: "FAILED", error: e instanceof Error ? e.message : String(e) });
      break;
    }
  }
  if (FINAL.includes(j.status)) window.dispatchEvent(new Event("swelt:credits"));
  return j;
}

export async function upload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
  return data.url;
}
