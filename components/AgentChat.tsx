"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, Loader2, Paperclip, Play, User, X } from "lucide-react";
import { getModel } from "@/lib/catalog";
import { FINAL, startRun, upload, waitFor, type JobView } from "@/lib/client";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";
import { Media } from "./Media";
import { AgentControls, type AgentPrefs } from "./PromptBox";

type Proposal = { model_id: string; input: Record<string, unknown>; reason?: string };
type Msg = { role: "user" | "assistant"; content: string; jobs?: JobView[]; proposals?: Proposal[]; attachments?: string[]; error?: boolean };

function toHistory(msgs: Msg[]) {
  return msgs
    .filter((m) => !m.error)
    .map((m) => {
      let content = m.content;
      if (m.attachments?.length) content += `\n\nAttached images: ${m.attachments.join(" , ")}`;
      const media = (m.jobs || []).flatMap((j) => j.media.map((u) => `${j.model_id}: ${u}`));
      if (media.length) content += `\n\n[Generated media]\n${media.join("\n")}`;
      return { role: m.role, content: content || "(no text)" };
    });
}

function JobCard({ job: initial }: { job: JobView }) {
  const [job, setJob] = useState(initial);
  useEffect(() => {
    if (FINAL.includes(initial.status)) return;
    const sig = { cancelled: false };
    waitFor(initial, setJob, sig);
    return () => void (sig.cancelled = true);
  }, [initial]);
  const model = getModel(job.model_id);
  return (
    <div className="card overflow-hidden">
      <div className="flex aspect-square items-center justify-center bg-[#0c0c0e]">
        {job.media[0] ? (
          <Media url={job.media[0]} kind={job.kind} />
        ) : job.status === "FAILED" ? (
          <div className="p-3 text-center text-xs text-rose-300">{job.error || "Failed"}</div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-xs text-muted">
            <Loader2 size={18} className="animate-spin" /> {job.status === "IN_PROGRESS" ? "Generating…" : "In queue…"}
          </div>
        )}
      </div>
      <Link href={`/models/${job.model_id}`} className="block truncate px-3 py-2 text-xs text-muted hover:text-white">
        {model?.name ?? job.model_id}
        {job.cost > 0 && ` · $${job.cost.toFixed(3)}`}
      </Link>
    </div>
  );
}

function ProposalCard({ p, onRun }: { p: Proposal; onRun: (j: JobView) => void }) {
  const [state, setState] = useState<"idle" | "running" | "done" | "skipped">("idle");
  const [err, setErr] = useState("");
  const model = getModel(p.model_id);
  return (
    <div className="card space-y-2 p-3 text-sm">
      <div className="font-medium">{model?.name ?? p.model_id}</div>
      {p.reason && <div className="text-muted">{p.reason}</div>}
      <pre className="max-h-40 overflow-auto rounded bg-[#0c0c0e] p-2 text-xs text-zinc-400">{JSON.stringify(p.input, null, 2)}</pre>
      {err && <div className="text-xs text-rose-300">{err}</div>}
      {state === "idle" && (
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
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
            <Play size={14} /> Approve & run {model && <span className="text-xs opacity-70">({model.priceLabel})</span>}
          </button>
          <button className="btn" onClick={() => setState("skipped")}><X size={14} /> Skip</button>
        </div>
      )}
      {state === "running" && <Loader2 className="animate-spin" size={16} />}
      {state === "done" && <div className="flex items-center gap-1 text-emerald-400"><Check size={14} /> Started</div>}
      {state === "skipped" && <div className="text-dim">Skipped</div>}
    </div>
  );
}

export function AgentChat() {
  const params = useSearchParams();
  const [prefs, setPrefs] = useState<AgentPrefs>(() => ({
    llm: (LLMS.find((l) => l.key === params.get("llm"))?.key ?? "opus") as LlmKey,
    effort: (EFFORTS.includes(params.get("effort") as Effort) ? params.get("effort") : "medium") as Effort,
    approval: params.get("approval") === "1",
  }));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const started = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (content: string, files: string[] = []) => {
      if (!content.trim() && !files.length) return;
      const next: Msg[] = [...msgs, { role: "user", content, attachments: files }];
      setMsgs(next);
      setText("");
      setAttachments([]);
      setBusy(true);
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: toHistory(next), ...prefs }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setMsgs((m) => [...m, { role: "assistant", content: data.reply || "", jobs: data.jobs, proposals: data.proposals }]);
        window.dispatchEvent(new Event("swelt:credits"));
      } catch (e) {
        setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : String(e), error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [msgs, prefs],
  );

  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) {
      started.current = true;
      send(q);
    }
  }, [params, send]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  const addJob = (i: number, j: JobView) =>
    setMsgs((m) => m.map((x, k) => (k === i ? { ...x, jobs: [...(x.jobs || []), j] } : x)));

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col px-4 py-6">
      <div className="flex-1 space-y-6">
        {msgs.length === 0 && !busy && (
          <div className="py-16 text-center">
            <h1 className="text-3xl font-semibold">What do you want to create?</h1>
            <p className="mt-2 text-muted">The Agent picks models, writes prompts and runs them on RunPod for you.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className="flex gap-3">
            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-panel-2" : "bg-gradient-to-br from-violet-500 to-pink-500"}`}>
              {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {m.content && <div className={`whitespace-pre-wrap leading-relaxed ${m.error ? "text-rose-300" : ""}`}>{m.content}</div>}
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex gap-2">
                  {m.attachments.map((u) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="" className="h-20 w-20 rounded-md object-cover" />
                  ))}
                </div>
              )}
              {m.proposals && m.proposals.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {m.proposals.map((p, k) => <ProposalCard key={k} p={p} onRun={(j) => addJob(i, j)} />)}
                </div>
              )}
              {m.jobs && m.jobs.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {m.jobs.map((j) => <JobCard key={j.request_id} job={j} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-3 text-muted">
            <Loader2 size={16} className="animate-spin" /> {LLMS.find((l) => l.key === prefs.llm)?.label} is working — picking models and generating…
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-4 mt-6 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50">
        {attachments.length > 0 && (
          <div className="flex gap-2 px-3 pt-3">
            {attachments.map((u, k) => (
              <div key={k} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-14 w-14 rounded-md object-cover" />
                <button className="absolute right-0.5 top-0.5 rounded bg-black/70" onClick={() => setAttachments((a) => a.filter((_, j) => j !== k))}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploading(true);
              try {
                const u = await upload(f);
                setAttachments((a) => [...a, u]);
              } catch (x) {
                alert(x instanceof Error ? x.message : "Upload failed");
              } finally {
                setUploading(false);
              }
            }}
          />
          <button className="btn h-10 w-10 justify-center p-0" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach image">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!busy) send(text, attachments);
              }
            }}
            rows={1}
            placeholder={msgs.length ? "Ask for changes, variations, or animate a result…" : "Describe what you want to generate…"}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-dim"
          />
          <button onClick={() => send(text, attachments)} disabled={busy || (!text.trim() && !attachments.length)} className="btn btn-primary h-10 w-10 justify-center p-0" aria-label="Send">
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="border-t border-line px-3 py-2">
          <AgentControls prefs={prefs} onChange={setPrefs} />
        </div>
      </div>
    </div>
  );
}
