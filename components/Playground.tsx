"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Model } from "@/lib/catalog";
import { FINAL, startRun, waitFor, type JobView } from "@/lib/client";
import { FieldInput, initialValues } from "./Fields";
import { Media, MediaActions } from "./Media";
import { CategoryChip } from "./ModelCard";



export function Playground({ model, preview }: { model: Model; preview?: { url: string; kind: string; source?: string } | null }) {
  const pathname = usePathname();
  const [isSignedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setSignedIn(Boolean(d.signedIn)))
      .catch(() => {});
  }, []);
  const [values, setValues] = useState(() => initialValues(model.fields));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [job, setJob] = useState<JobView | null>(null);
  const [history, setHistory] = useState<JobView[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cancel = useRef({ cancelled: false });

  useEffect(() => {
    if (!isSignedIn) return;
    fetch(`/api/generations?limit=100&kind=${model.kind}`)
      .then((r) => r.json())
      .then((d) => setHistory((d.items || []).filter((g: JobView) => g.model_id === model.id).slice(0, 12)))
      .catch(() => {});
  }, [isSignedIn, model.id, model.kind]);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const i = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    return () => clearInterval(i);
  }, [running]);

  useEffect(() => () => void (cancel.current.cancelled = true), []);

  const basic = model.fields.filter((f) => !f.advanced);
  const advanced = model.fields.filter((f) => f.advanced);

  const run = async () => {
    if (!isSignedIn) return void window.location.assign(`/login?next=${encodeURIComponent(pathname)}`);
    setError("");
    setRunning(true);
    setElapsed(0);
    try {
      const j = await startRun(model.id, values);
      setJob(j);
      const final = await waitFor(j, setJob, cancel.current);
      setJob(final);
      if (final.status === "FAILED") setError(final.error || "Generation failed");
      setHistory((h) => [final, ...h.filter((x) => x.request_id !== final.request_id)].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const media = job?.media ?? [];
  const busy = running || (job && !FINAL.includes(job.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            <span className="text-muted">{model.lab}/</span>
            {model.id.split("/").slice(1).join("/")}
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-muted">{model.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryChip category={model.category} />
            {model.tags.map((t) => (
              <span key={t} className="chip">{t}</span>
            ))}
            <span className="chip">{model.priceLabel}</span>
          </div>
        </div>
      </div>

      {(
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Input</h2>
              <button className="btn px-2 py-1 text-xs" onClick={() => setValues(initialValues(model.fields))}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>
            {basic.map((f) => (
              <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
            ))}
            {advanced.length > 0 && (
              <div className="rounded-lg border border-line">
                <button className="flex w-full items-center justify-between px-3 py-2.5 text-sm" onClick={() => setShowAdvanced((x) => !x)}>
                  <span className="flex items-center gap-2"><SlidersHorizontal size={14} /> Additional settings</span>
                  <ChevronDown size={16} className={showAdvanced ? "rotate-180" : ""} />
                </button>
                {showAdvanced && (
                  <div className="space-y-4 border-t border-line p-3">
                    {advanced.map((f) => (
                      <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={run} disabled={!!busy} className="btn btn-primary w-full justify-center py-2.5 text-base">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              {isSignedIn ? (busy ? "Running…" : "Run") : "Sign in to run"}
            </button>
          </div>

          <div className="card flex flex-col p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Result</h2>
              {job && (
                <span className="text-xs text-dim">
                  {job.status}
                  {running && ` · ${elapsed.toFixed(1)}s`}
                  {job.status === "COMPLETED" && job.cost > 0 && ` · $${job.cost.toFixed(4)}`}
                </span>
              )}
            </div>
            <div className="mt-4 flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-[#0c0c0e]">
              {media.length > 0 ? (
                <div className={`grid h-full w-full gap-2 ${media.length > 1 ? "grid-cols-2" : ""}`}>
                  {media.map((u) => (
                    <div key={u} className="flex max-h-[640px] items-center justify-center"><Media url={u} kind={model.kind} /></div>
                  ))}
                </div>
              ) : busy ? (
                <div className="flex flex-col items-center gap-3 text-sm text-muted">
                  <Loader2 className="animate-spin" />
                  {job?.status === "IN_PROGRESS" ? "Generating…" : "In queue…"} {elapsed.toFixed(0)}s
                  {model.kind === "video" && <span className="text-xs text-dim">Videos usually take 1–5 minutes.</span>}
                </div>
              ) : preview ? (
                <div className="relative flex h-full w-full items-center justify-center">
                  <Media url={preview.url} kind={preview.kind} />
                  <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-zinc-300">
                    Example output
                    {preview.source && (
                      <>
                        {" · "}
                        <a href={preview.source} target="_blank" rel="noreferrer" className="underline">source</a>
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-dim">Your {model.kind} will appear here.</div>
              )}
            </div>
            {error && <div className="mt-3 rounded-md border border-[#e5484d]/30 bg-[#e5484d]/10 p-3 text-sm text-[#ff9592]">{error}</div>}
            {media[0] && <div className="mt-3"><MediaActions url={media[0]} /></div>}
            {job && FINAL.includes(job.status) && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">Raw response</summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-[#0c0c0e] p-3 text-xs text-zinc-400">{JSON.stringify(job, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Your recent runs</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {history.map((h) => (
              <button key={h.request_id} onClick={() => setJob(h)} className="card aspect-square overflow-hidden">
                {h.media[0] ? <Media url={h.media[0]} kind={h.kind} className="object-cover" /> : <span className="text-xs text-dim">{h.status}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
