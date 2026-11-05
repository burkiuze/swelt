"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Braces,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Hand,
  ImageIcon,
  Images,
  Loader2,
  PanelRight,
  Paperclip,
  Play,
  Plus,
  Search,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { getModel } from "@/lib/catalog";
import { FINAL, pollRun, startRun, upload, type JobView } from "@/lib/client";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";
import { Media } from "./Media";
import { AgentRail } from "./AgentRail";
import { MediaPicker } from "./MediaPicker";
import { Markdown } from "./Markdown";
import { ModelPicker } from "./ModelPicker";

type Proposal = { model_id: string; input: Record<string, unknown>; reason?: string };
type Step = { label: string; ms: number; kind: "think" | "tool"; detail?: unknown };
type Msg = {
  role: "user" | "assistant";
  content: string;
  at: number;
  jobIds?: string[];
  proposals?: Proposal[];
  attachments?: string[];
  steps?: Step[];
  ms?: number;
  error?: boolean;
};

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;

function toHistory(msgs: Msg[], jobs: Record<string, JobView>) {
  return msgs
    .filter((m) => !m.error)
    .map((m) => {
      let content = m.content;
      if (m.attachments?.length) content += `\n\nAttached images: ${m.attachments.join(" , ")}`;
      const media = (m.jobIds || []).flatMap((id) => (jobs[id]?.media || []).map((u) => `${jobs[id].model_id}: ${u}`));
      if (media.length) content += `\n\n[Generated media]\n${media.join("\n")}`;
      return { role: m.role, content: content || "(no text)" };
    });
}

/* ---------------- pieces ---------------- */

function Steps({ steps, ms }: { steps: Step[]; ms: number }) {
  const [open, setOpen] = useState(true);
  const [detail, setDetail] = useState<number | null>(null);
  return (
    <div className="text-[13px]">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-muted hover:text-white">
        Worked for {secs(ms)} <ChevronDown size={14} className={open ? "" : "-rotate-90"} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center text-dim">{s.kind === "think" ? <Brain size={14} /> : <Zap size={14} />}</span>
                <span className="text-zinc-300">{s.label}</span>
                <span className="text-dim">{secs(s.ms)}</span>
                {s.detail !== undefined && (
                  <button onClick={() => setDetail(detail === i ? null : i)} className="flex items-center gap-0.5 text-xs font-medium text-zinc-300 hover:text-white">
                    Output <ChevronDown size={12} className={detail === i ? "rotate-180" : ""} />
                  </button>
                )}
              </div>
              {detail === i && (
                <pre className="ml-7 mt-1.5 max-h-56 overflow-auto rounded-md border border-line bg-[#141414] p-2.5 text-xs text-zinc-400">
                  {JSON.stringify(s.detail, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaTile({ job, onOpen }: { job: JobView; onOpen: (u: string, kind: string) => void }) {
  const url = job.media[0];
  if (url)
    return (
      <button onClick={() => onOpen(url, job.kind)} className="h-44 shrink-0 overflow-hidden rounded-md bg-[#141414]">
        {job.kind === "video" ? (
          <video src={url} autoPlay muted loop playsInline className="h-full w-auto" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-auto" />
        )}
      </button>
    );
  return (
    <div className={`flex h-44 w-44 shrink-0 flex-col items-center justify-center gap-2 rounded-md p-3 text-center text-xs ${job.status === "FAILED" ? "border border-[#e5484d]/30 bg-[#e5484d]/5 text-[#ff9592]" : "shimmer text-muted"}`}>
      {job.status === "FAILED" ? (
        <span className="line-clamp-5">{job.error || "Failed"}</span>
      ) : (
        <>
          <Loader2 size={16} className="animate-spin" />
          {getModel(job.model_id)?.name ?? job.model_id}
          <span className="text-dim">{job.status === "IN_PROGRESS" ? "Generating…" : "In queue…"}</span>
        </>
      )}
    </div>
  );
}

function ProposalCard({ p, onRun }: { p: Proposal; onRun: (j: JobView) => void }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "skipped">("idle");
  const [err, setErr] = useState("");
  const model = getModel(p.model_id);
  return (
    <div className="rounded-md border border-line bg-panel p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{model?.name ?? p.model_id}</span>
        <span className="text-xs text-dim">{model?.priceLabel}</span>
      </div>
      {p.reason && <div className="mt-1 text-muted">{p.reason}</div>}
      {typeof p.input.prompt === "string" && <div className="mt-2 line-clamp-3 rounded bg-[#141414] px-2.5 py-1.5 text-xs text-zinc-400">{p.input.prompt}</div>}
      {err && <div className="mt-2 text-xs text-[#ff9592]">{err}</div>}
      <div className="mt-2.5 flex gap-2">
        {state === "idle" && (
          <>
            <button
              className="btn btn-primary h-8"
              onClick={async () => {
                setState("running");
                try {
                  onRun(await startRun(p.model_id, p.input, "agent"));
                  setState("done");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                  setState("idle");
                }
              }}
            >
              <Play size={13} /> Run
            </button>
            <button className="btn h-8" onClick={() => setState("skipped")}>Skip</button>
          </>
        )}
        {state === "running" && <Loader2 className="animate-spin" size={16} />}
        {state === "done" && <span className="flex items-center gap-1 text-xs text-[#4ade80]"><Check size={13} /> Started</span>}
        {state === "skipped" && <span className="text-xs text-dim">Skipped</span>}
      </div>
    </div>
  );
}

function Lightbox({ item, onClose }: { item: { url: string; kind: string } | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={onClose}>
      <div className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Media url={item.url} kind={item.kind} className="max-h-[80vh]" />
        <div className="mt-3 flex justify-center gap-2">
          <a href={item.url} target="_blank" rel="noreferrer" className="btn">Open</a>
          <a href={item.url} download className="btn">Download</a>
          <button onClick={onClose} className="btn"><X size={14} /> Close</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 py-1.5 text-sm">
        <span className="text-muted">{icon}</span>
        <span className="font-semibold">{title}</span>
        <span className="text-dim">{count}</span>
        <span className="flex-1" />
        <ChevronRight size={14} className={`text-dim transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

/* ---------------- main ---------------- */

export function AgentChat() {
  const params = useSearchParams();
  const [llm, setLlm] = useState<LlmKey>((LLMS.find((l) => l.key === params.get("llm"))?.key ?? "glm") as LlmKey);
  const [media, setMedia] = useState<string>(params.get("media") || "auto");
  const mediaKind = (["image", "video"].includes(params.get("kind") || "") ? params.get("kind") : undefined) as "image" | "video" | undefined;
  const [effort, setEffort] = useState<Effort>((EFFORTS.includes(params.get("effort") as Effort) ? params.get("effort") : "medium") as Effort);
  const [approval, setApproval] = useState(params.get("approval") === "1");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobView>>({});
  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [panel, setPanel] = useState(true);
  const [filter, setFilter] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string; kind: string } | null>(null);
  const started = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const addJobs = useCallback((list: JobView[]) => setJobs((j) => ({ ...j, ...Object.fromEntries(list.map((x) => [x.request_id, x])) })), []);

  // Poll every unfinished job.
  const pending = Object.values(jobs)
    .filter((j) => !FINAL.includes(j.status))
    .map((j) => j.request_id)
    .join(",");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(async () => {
      const updates = await Promise.all(pending.split(",").map((id) => pollRun(id).catch(() => null)));
      addJobs(updates.filter((u): u is JobView => Boolean(u)));
      if (updates.some((u) => u && FINAL.includes(u.status))) window.dispatchEvent(new Event("swelt:credits"));
    }, 3000);
    return () => clearInterval(t);
  }, [pending, addJobs]);

  const send = useCallback(
    async (content: string, files: string[] = []) => {
      if ((!content.trim() && !files.length) || busy) return;
      const next: Msg[] = [...msgs, { role: "user", content, attachments: files, at: Date.now() }];
      setMsgs(next);
      setText("");
      setSuggestion(null);
      setAttachments([]);
      setBusy(true);
      // Never spin forever: give up a little before the server's own 300 s limit.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 290_000);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          signal: ctrl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: toHistory(next, jobsRef.current), llm, effort, approval, media: media === "auto" ? undefined : media }),
        });
        const data = await res.json().catch(() => ({ error: res.status === 504 ? "The agent took too long to answer. Please try again." : `Server error (${res.status}). Please try again.` }));
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        addJobs(data.jobs || []);
        setSuggestion(data.suggestion || null);
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply || "",
            jobIds: (data.jobs || []).map((j: JobView) => j.request_id),
            proposals: data.proposals,
            steps: data.steps,
            ms: data.ms,
            at: Date.now(),
          },
        ]);
        window.dispatchEvent(new Event("swelt:credits"));
      } catch (e) {
        const text = e instanceof DOMException && e.name === "AbortError" ? "The agent took too long to answer. Please try again." : e instanceof Error ? e.message : String(e);
        setMsgs((m) => [...m, { role: "assistant", content: text, error: true, at: Date.now() }]);
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [msgs, llm, effort, approval, media, busy, addJobs],
  );

  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) {
      started.current = true;
      send(q);
    }
  }, [params, send]);

  // Braces matter: newer Chromium returns a Promise from scrollIntoView, and React treats a
  // value returned from an effect as its cleanup function.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy]);

  const allAttachments = useMemo(() => msgs.flatMap((m) => m.attachments || []), [msgs]);
  const outputs = useMemo(
    () => Object.values(jobs).filter((j) => j.media[0] && (!filter || j.model_id.toLowerCase().includes(filter.toLowerCase()))),
    [jobs, filter],
  );
  const outputCount = Object.values(jobs).filter((j) => j.media[0]).length;
  const totalCost = Object.values(jobs).reduce((a, j) => a + (j.cost || 0), 0);
  const title = msgs.find((m) => m.role === "user")?.content.slice(0, 60) || "New generation";

  const onFile = async (f: File) => {
    setUploading(true);
    try {
      const u = await upload(f);
      setAttachments((a) => [...a, u]);
    } catch (x) {
      alert(x instanceof Error ? x.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden">
      <AgentRail onTogglePanel={() => setPanel((p) => !p)} />
      {/* ---------- chat column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-4 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
          <a href="/agent" className="btn h-8">
            <Plus size={14} /> New
          </a>
          <button className="btn hidden h-8 lg:inline-flex" onClick={() => setPanel((p) => !p)} title="Toggle media panel">
            <PanelRight size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] space-y-6 px-4 py-5 text-sm">
            {msgs.length === 0 && !busy && (
              <div className="py-20 text-center">
                <h1 className="text-xl font-semibold tracking-tight">What do you want to create?</h1>
                <p className="mt-1.5 text-sm text-muted">The Agent picks models, writes prompts and runs them on RunPod for you.</p>
              </div>
            )}

            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-2">
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="flex gap-2">
                      {m.attachments.map((u) => (
                        <button key={u} onClick={() => setLightbox({ url: u, kind: "image" })} className="h-28 overflow-hidden rounded-md border border-line bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-full w-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  {m.content && <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-panel-2 px-3 py-2">{m.content}</div>}
                  <div className="flex items-center gap-2 text-xs text-dim">
                    {new Date(m.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    <button onClick={() => navigator.clipboard.writeText(m.content)} className="hover:text-white" title="Copy">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-4">
                  {m.steps && m.steps.length > 0 && <Steps steps={m.steps} ms={m.ms ?? 0} />}
                  {m.content &&
                    (m.error ? (
                      <div className="whitespace-pre-wrap leading-relaxed text-[#ff9592]">{m.content}</div>
                    ) : (
                      <div className="leading-relaxed text-zinc-200">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ))}
                  {m.proposals && m.proposals.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {m.proposals.map((p, k) => (
                        <ProposalCard
                          key={k}
                          p={p}
                          onRun={(j) => {
                            addJobs([j]);
                            setMsgs((all) => all.map((x, n) => (n === i ? { ...x, jobIds: [...(x.jobIds || []), j.request_id] } : x)));
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {m.jobIds && m.jobIds.length > 0 && (
                    <div className="scrollbar-none flex gap-2 overflow-x-auto">
                      {m.jobIds.map((id) => jobs[id] && <MediaTile key={id} job={jobs[id]} onOpen={(url, kind) => setLightbox({ url, kind })} />)}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" /> Working…
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        {/* ---------- composer ---------- */}
        <div className="shrink-0 px-4 pb-3">
          <div className="mx-auto max-w-[760px] rounded-lg border border-line bg-panel">
            {attachments.length > 0 && (
              <div className="flex gap-2 px-3 pt-3">
                {attachments.map((u, k) => (
                  <div key={k} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-12 w-12 rounded-md object-cover" />
                    <button className="absolute -right-1 -top-1 rounded-full bg-black p-0.5" onClick={() => setAttachments((a) => a.filter((_, j) => j !== k))}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 px-3 pb-1 pt-2.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && !text && suggestion) {
                    e.preventDefault();
                    setText(suggestion);
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(text, attachments);
                  }
                }}
                rows={1}
                placeholder={suggestion || (msgs.length ? "Ask for changes, variations, or animate a result…" : "Describe what you want to generate…")}
                className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-dim"
              />
              {suggestion && !text && <span className="mb-2 hidden shrink-0 rounded border border-line-2 px-1.5 text-[11px] text-dim sm:inline">Tab to use</span>}
              <button
                onClick={() => send(text, attachments)}
                disabled={busy || (!text.trim() && !attachments.length)}
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ededed] text-black transition hover:bg-[#d4d4d4] disabled:bg-[#2a2a2a] disabled:text-dim"
                aria-label="Send"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-1 px-2 pb-1.5 text-[13px]">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onFile(f);
                }}
              />
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-white"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Attach image"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
              </button>
              <button
                onClick={() => setApproval((a) => !a)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-panel-2 ${approval ? "text-zinc-200" : "text-[#facc15]"}`}
                title="Full auto runs models immediately; Ask for approval shows a plan first"
              >
                {approval ? <Hand size={14} /> : <Zap size={14} />} {approval ? "Ask for approval" : "Full auto"}
              </button>
              <span className="flex-1" />
              <MediaPicker kind={mediaKind} value={media} onChange={setMedia} />
              <ModelPicker
                llm={llm}
                effort={effort}
                onChange={(v) => {
                  setLlm(v.llm);
                  setEffort(v.effort);
                }}
              />
              <span className="flex items-center gap-1 px-1.5 text-muted" title="Outputs in this chat">
                <Images size={14} /> {outputCount}
              </span>
              <span className="px-1.5 font-semibold" title="Cost of this chat">
                ${totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- media panel ---------- */}
      {panel && (
        <aside className="hidden w-[320px] shrink-0 flex-col border-l border-line lg:flex">
          <div className="flex h-10 items-center gap-1 border-b border-line px-3 text-[13px]">
            <span className="flex items-center gap-1.5 rounded-md bg-panel-2 px-2.5 py-1 font-medium">
              <ImageIcon size={14} /> Media
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-dim">
              <Braces size={14} /> Context
            </span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by model" className="input h-8 pl-8 text-sm" />
            </div>
            <Section title="Attachments" count={allAttachments.length} icon={<Upload size={14} />}>
              {allAttachments.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {allAttachments.map((u) => (
                    <button key={u} onClick={() => setLightbox({ url: u, kind: "image" })} className="aspect-square overflow-hidden rounded-md bg-[#141414]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-dim">Images you attach show up here.</p>
              )}
            </Section>
            <Section title="Outputs" count={outputs.length} icon={<Images size={14} />}>
              {outputs.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {outputs.map((j) => (
                    <button
                      key={j.request_id}
                      onClick={() => setLightbox({ url: j.media[0], kind: j.kind })}
                      className="relative aspect-square overflow-hidden rounded-md bg-[#141414]"
                      title={j.model_id}
                    >
                      <Media url={j.media[0]} kind={j.kind} className="object-cover" />
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 p-0.5">{j.kind === "video" ? <Play size={11} /> : <ImageIcon size={11} />}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-dim">Generated images and videos collect here.</p>
              )}
            </Section>
          </div>
        </aside>
      )}

      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
