"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, RefreshCw, Sparkles } from "lucide-react";
import { waitFor, type JobView } from "@/lib/client";
import { Media } from "./Media";

type Item = {
  model_id: string;
  name: string;
  kind: "image" | "video";
  price: number;
  preview: { url: string; kind: string } | null;
  blockedBy: string | null;
};

const BASE_ORDER = ["black-forest-labs/flux-1-schnell", "pruna/p-video"];

export function PreviewsAdmin() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/showcase");
    const d = await r.json();
    if (!r.ok) return setError(d.error || "Failed to load");
    setItems(d.items);
    return d.items as Item[];
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string) => {
    setRunning((s) => ({ ...s, [id]: "Starting…" }));
    try {
      const r = await fetch("/api/admin/showcase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model_id: id }) });
      const j = (await r.json()) as JobView & { error?: string };
      if (!r.ok && !j.request_id) throw new Error(j.error || `HTTP ${r.status}`);
      const done = await waitFor(j, (u) => setRunning((s) => ({ ...s, [id]: u.status === "IN_PROGRESS" ? "Generating…" : "In queue…" })));
      setRunning((s) => ({ ...s, [id]: done.status === "COMPLETED" ? "Done" : `Failed: ${done.error ?? done.status}` }));
    } catch (e) {
      setRunning((s) => ({ ...s, [id]: `Failed: ${e instanceof Error ? e.message : e}` }));
    }
    return load();
  };

  const runMissing = async () => {
    setBatch(true);
    let list = items ?? [];
    // Base media first, so edit / image-to-video models have an input to work from.
    for (const id of BASE_ORDER) {
      if (!list.find((i) => i.model_id === id)?.preview) list = (await run(id)) ?? list;
    }
    for (const it of list.filter((i) => !i.preview && !BASE_ORDER.includes(i.model_id))) await run(it.model_id);
    setBatch(false);
  };

  const missing = items?.filter((i) => !i.preview) ?? [];
  const cost = missing.reduce((a, i) => a + i.price, 0);

  if (error) return <div className="card p-6 text-[#ff9592]">{error}</div>;
  if (!items) return <Loader2 className="mx-auto animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Model previews</h1>
          <p className="mt-1 text-muted">
            Each model card shows a real output generated on RunPod. {missing.length} missing · about ${cost.toFixed(2)} to generate them all.
          </p>
        </div>
        <button className="btn btn-primary" disabled={batch || !missing.length} onClick={runMissing}>
          {batch ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Generate all missing
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.model_id} className="card overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-[#141414]">
              {i.preview ? <Media url={i.preview.url} kind={i.preview.kind} className="object-cover" /> : <span className="text-sm text-dim">No preview</span>}
            </div>
            <div className="space-y-2 p-3 text-sm">
              <div className="truncate font-medium">{i.model_id}</div>
              <div className="text-xs text-dim">
                {running[i.model_id] ?? (i.blockedBy && !i.preview ? `Needs ${i.blockedBy} preview first` : i.preview ? "Ready" : "Missing")}
              </div>
              <button className="btn w-full justify-center" disabled={batch || !!i.blockedBy || /…$/.test(running[i.model_id] ?? "")} onClick={() => run(i.model_id)}>
                {i.preview ? <RefreshCw size={14} /> : <Play size={14} />} {i.preview ? "Regenerate" : "Generate"} · ${i.price.toFixed(3)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
