"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Check, ChevronDown, Code2, Copy, Loader2, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Model } from "@/lib/catalog";
import { FINAL, startRun, waitFor, type JobView } from "@/lib/client";
import { FieldInput, initialValues } from "./Fields";
import { Media, MediaActions } from "./Media";
import { CategoryChip } from "./ModelCard";

function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: (t: string) => {
      navigator.clipboard.writeText(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
  };
}

function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative">
      <button onClick={() => copy(code)} className="btn absolute right-2 top-2 px-2 py-1 text-xs">
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-lg border border-line bg-[#0c0c0e] p-4 text-[13px] leading-relaxed text-zinc-300">{code}</pre>
    </div>
  );
}

export function Playground({ model, preview }: { model: Model; preview?: { url: string; kind: string; source?: string } | null }) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const [tab, setTab] = useState<"playground" | "api">("playground");
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
    if (!isSignedIn) return clerk.openSignIn();
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

  const exampleInput = useMemo(() => {
    const o: Record<string, unknown> = {};
    for (const f of model.fields) {
      if (f.name === "prompt") o.prompt = String(values.prompt || "a red fox in a glass sphere, cinematic lighting");
      else if (f.required && f.type === "images") o[f.name] = ["https://example.com/reference.png"];
      else if (f.required && f.type === "image") o[f.name] = "https://example.com/start.png";
      else if (f.required) o[f.name] = values[f.name];
    }
    return o;
  }, [model.fields, values]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://vlipa.dev";
  const curl = `curl -X POST ${origin}/api/run \\
  -H "Authorization: Key $SWELT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ model: model.id, input: exampleInput })}'

# → { "request_id": "…", "status": "IN_QUEUE", … }
curl ${origin}/api/requests/<request_id> -H "Authorization: Key $SWELT_KEY"`;
  const js = `const SWELT = "${origin}";
const headers = { Authorization: \`Key \${process.env.SWELT_KEY}\`, "Content-Type": "application/json" };

let job = await fetch(\`\${SWELT}/api/run\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    model: "${model.id}",
    input: ${JSON.stringify(exampleInput, null, 2).replace(/\n/g, "\n    ")},
  }),
}).then((r) => r.json());

while (!["COMPLETED", "FAILED"].includes(job.status)) {
  await new Promise((r) => setTimeout(r, 2000));
  job = await fetch(\`\${SWELT}/api/requests/\${job.request_id}\`, { headers }).then((r) => r.json());
}
console.log(job.media); // array of ${model.kind} URLs`;

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
        <div className="flex rounded-lg border border-line p-1">
          {(["playground", "api"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-panel-2" : "text-muted"}`}>
              {t === "api" ? <Code2 size={14} /> : <Play size={14} />} {t === "api" ? "API" : "Playground"}
            </button>
          ))}
        </div>
      </div>

      {tab === "playground" ? (
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-semibold">cURL</h2>
            <CodeBlock code={curl} />
            <p className="text-sm text-muted">
              Create a key on the <a href="/keys" className="text-white underline underline-offset-2">API Keys</a> page. Requests are async: submit, then poll the request until it is <code>COMPLETED</code>.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">JavaScript</h2>
            <CodeBlock code={js} />
          </div>
          <div className="space-y-3 lg:col-span-2">
            <h2 className="font-semibold">Input schema</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr className="border-b border-line">
                    <th className="p-3">Field</th><th className="p-3">Type</th><th className="p-3">Default</th><th className="p-3">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {model.fields.map((f) => (
                    <tr key={f.name} className="border-b border-line last:border-0">
                      <td className="p-3 font-mono">{f.name}{f.required && <span className="text-[#ff9592]">*</span>}</td>
                      <td className="p-3 text-muted">{f.type === "images" ? "string[] (URLs)" : f.type === "image" ? "string (URL)" : f.type === "seed" ? "integer" : f.type}</td>
                      <td className="p-3 text-muted">{f.default === undefined || f.default === "" ? "—" : String(f.default)}</td>
                      <td className="p-3 text-muted">{f.options?.join(", ") || (f.min !== undefined ? `${f.min}–${f.max}` : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
