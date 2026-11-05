"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { getModel } from "@/lib/catalog";
import type { JobView } from "@/lib/client";
import { Media, MediaActions } from "./Media";

export function Assets() {
  const params = useSearchParams();
  const [kind, setKind] = useState<"" | "image" | "video">("");
  const [items, setItems] = useState<JobView[] | null>(null);
  const [open, setOpen] = useState<JobView | null>(null);

  useEffect(() => {
    setItems(null);
    fetch(`/api/generations?limit=200${kind ? `&kind=${kind}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        const id = params.get("id");
        if (id) setOpen((d.items || []).find((x: JobView) => x.request_id === id) || null);
      })
      .catch(() => setItems([]));
  }, [kind, params]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Assets</h1>
        <div className="flex gap-2">
          {(["", "image", "video"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`btn ${kind === k ? "bg-panel-2" : "text-muted"}`}>
              {k === "" ? "All" : k === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <ImageIcon className="text-dim" />
          <div className="font-semibold">Nothing here… yet.</div>
          <Link href="/explore" className="btn btn-primary">Explore models</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((g) => (
            <button key={g.request_id} onClick={() => setOpen(g)} className="card group overflow-hidden text-left">
              <div className="flex aspect-square items-center justify-center bg-panel-2">
                {g.media[0] ? (
                  <Media url={g.media[0]} kind={g.kind} className="object-cover" />
                ) : (
                  <span className={`px-2 text-center text-xs ${g.status === "FAILED" ? "text-rose-300" : "text-dim"}`}>{g.status}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                <span className="truncate text-muted">{getModel(g.model_id)?.name ?? g.model_id}</span>
                <span className="shrink-0 text-dim">{g.created_at ? new Date(g.created_at).toLocaleDateString() : ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <div className="card grid max-h-[90vh] w-full max-w-5xl overflow-auto md:grid-cols-[2fr_1fr]" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-h-[300px] items-center justify-center bg-[#0c0c0e]">
              {open.media[0] ? <Media url={open.media[0]} kind={open.kind} /> : <span className="text-sm text-dim">{open.error || open.status}</span>}
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between">
                <Link href={`/models/${open.model_id}`} className="font-semibold hover:underline">{open.model_id}</Link>
                <button onClick={() => setOpen(null)}><X size={18} /></button>
              </div>
              <div className="text-muted">{open.status} · ${open.cost.toFixed(4)} · {open.created_at && new Date(open.created_at).toLocaleString()}</div>
              {open.media[0] && <MediaActions url={open.media[0]} />}
              <pre className="max-h-80 overflow-auto rounded-lg bg-[#0c0c0e] p-3 text-xs text-zinc-400">{JSON.stringify(open.output ?? {}, null, 2)}</pre>
              <Link href={`/models/${open.model_id}`} className="btn w-full justify-center">Open in playground</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
