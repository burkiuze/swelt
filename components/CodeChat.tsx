"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Bug, Check, ChevronDown, Code2, GitCommitHorizontal, History, Lightbulb, Loader2, Lock, PenLine, Plus, Square, Trash2, X } from "lucide-react";
import { CODE_MODELS, CODE_PLAN, type CodeModelKey } from "@/lib/plans";
import { Markdown } from "./Markdown";
import { useAutosize } from "./useAutosize";
import { LAB_LOGOS } from "@/lib/labs";
import { AttachFiles, CommitCard, FileChip, GithubButton, parseFiles, useGithub, type Attached } from "./CodeGithub";

type Mode = "build" | "debug" | "explain";
type Msg = { role: "user" | "assistant"; content: string; error?: boolean; model?: CodeModelKey; files?: string[]; ctx?: string };
type Chat = { id: string; title: string; updatedAt: number; model: CodeModelKey; msgs: Msg[] };
type Status = { active: boolean; expires: string | null; used: number; limit: number; unlimited?: boolean; plan?: string };

const KEY = "vlipa-code-chats-v1";
const readChats = (): Chat[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const writeChats = (list: Chat[]) => {
  for (let n = list.length; n > 0; n = Math.floor(n * 0.75)) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, n)));
      return;
    } catch {}
  }
};
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));
const freshChat = (model: CodeModelKey = "minimax"): Chat => ({ id: newId(), title: "New chat", updatedAt: Date.now(), model, msgs: [] });

const MODES: { key: Mode; label: string; icon: typeof PenLine; hint: string; placeholder: string }[] = [
  { key: "build", label: "Write", icon: PenLine, hint: "", placeholder: "What should we build? Describe it or paste code…" },
  { key: "debug", label: "Debug", icon: Bug, hint: "Find the bug, explain the root cause briefly, then give the fixed code.", placeholder: "Paste the error and the code that throws it…" },
  { key: "explain", label: "Explain", icon: Lightbulb, hint: "Explain step by step in simple words, with a short example.", placeholder: "Paste code or ask how something works…" },
];

const SUGGESTIONS: Record<Mode, string[]> = {
  build: ["A Python script that renames photos by their EXIF date", "A responsive pricing section with Tailwind CSS", "A REST API in Express with JWT login"],
  debug: ["TypeError: Cannot read properties of undefined (reading 'map')", "My useEffect runs in an infinite loop", "CORS error when calling my API from the browser"],
  explain: ["How does async/await work in JavaScript?", "Explain SQL JOIN types with examples", "What is the difference between git merge and rebase?"],
};

function LabMark({ lab, label }: { lab: string; label: string }) {
  const src = LAB_LOGOS[lab];
  if (src) return <img src={src} alt="" className="h-5 w-5 shrink-0 object-contain opacity-90" />;
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-semibold text-white/80">{label[0]}</span>;
}

function ModelMenu({ value, onChange, ultra }: { value: CodeModelKey; onChange: (k: CodeModelKey) => void; ultra: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const current = CODE_MODELS.find((m) => m.key === value) ?? CODE_MODELS[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 items-center gap-2 rounded-full px-4 text-[14px] transition ${open ? "bg-[#2e2f33] text-white" : "bg-[#2a2b2f] text-zinc-200 hover:bg-[#2e2f33]"}`}
      >
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">Model</span>
        <ChevronDown size={15} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-line-2 bg-[#1e1f22] p-2 shadow-2xl shadow-black/60">
          {!ultra && (
            <Link href="/pricing" className="mb-1 flex items-center justify-between rounded-2xl border border-white/5 bg-[#24272a] px-4 py-3 text-[15px] text-zinc-100 transition hover:bg-[#2a2e31]">
              Get access to the best models <ArrowRight size={18} className="text-[#5fc7b4]" />
            </Link>
          )}
          <div className="max-h-[min(26rem,60vh)] overflow-y-auto">
            {CODE_MODELS.map((m) => {
              const locked = m.ultra && !ultra;
              const row = (
                <>
                  <LabMark lab={m.lab} label={m.vendor} />
                  <span className={`flex min-w-0 flex-1 items-center gap-2 ${locked ? "text-zinc-400" : "text-zinc-100"}`}>
                    <span className="truncate text-[15px]">{m.label}</span>
                    {m.isNew && <span className="rounded-md bg-[#5fc7b4]/10 px-1.5 py-0.5 text-[11px] text-[#5fc7b4]">New</span>}
                    {m.ultra && <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">Ultra</span>}
                  </span>
                  {locked ? <Lock size={16} className="text-zinc-500" /> : m.key === value ? <Check size={16} className="text-white" /> : null}
                </>
              );
              const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5";
              return locked ? (
                <Link key={m.key} href="/pricing" className={cls} title="Needs the Ultra plan">
                  {row}
                </Link>
              ) : (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    onChange(m.key);
                    setOpen(false);
                  }}
                  className={cls}
                >
                  {row}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CodeChat() {
  const [status, setStatus] = useState<Status | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chat, setChat] = useState<Chat>(() => freshChat());
  const [mode, setMode] = useState<Mode>("build");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attached, setAttached] = useState<Attached[]>([]);
  const gh = useGithub();
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useAutosize(text, 260);

  const loadStatus = useCallback(() => {
    fetch("/api/code", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ active: false, expires: null, used: 0, limit: CODE_PLAN.dailyLimit }));
  }, []);

  useEffect(() => {
    loadStatus();
    setChats(readChats());
  }, [loadStatus]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat.msgs]);

  const save = (c: Chat) => {
    if (!c.msgs.length) return;
    c = { ...c, msgs: c.msgs.map((m) => (m.ctx && m.ctx.length > 60_000 ? { ...m, ctx: m.ctx.slice(0, 60_000) } : m)) };
    const list = [c, ...readChats().filter((x) => x.id !== c.id)].slice(0, 50);
    writeChats(list);
    setChats(list);
  };

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    const hint = MODES.find((m) => m.key === mode)?.hint;
    const ctx = attached.map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");
    const asked = (hint && !chat.msgs.length ? `${content}\n\n(${hint})` : content) + (ctx ? `\n\n${ctx}` : "");
    const msgs: Msg[] = [...chat.msgs, { role: "user", content, ...(attached.length ? { files: attached.map((f) => f.path), ctx } : {}) }];
    const apiMsgs = [
      ...chat.msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.ctx ? `${m.content}\n\n${m.ctx}` : m.content })),
      { role: "user" as const, content: asked },
    ];
    setAttached([]);
    let current: Chat = { ...chat, msgs, title: chat.msgs.length ? chat.title : content.slice(0, 60), updatedAt: Date.now() };
    setChat(current);
    setText("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: chat.model, messages: apiMsgs, repo: gh.target?.repo, branch: gh.target?.branch }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        current = { ...current, msgs: [...msgs, { role: "assistant", content: answer, model: chat.model }] };
        setChat(current);
      }
      if (!answer.trim()) throw new Error("The model returned an empty answer. Please try again.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        const msg = /failed to fetch|load failed|network/i.test(raw) ? "Connection lost. The answer may be incomplete — try again." : raw;
        const last = current.msgs[current.msgs.length - 1];
        current = { ...current, msgs: last?.role === "assistant" ? [...current.msgs, { role: "assistant", content: msg, error: true }] : [...msgs, { role: "assistant", content: msg, error: true }] };
        setChat(current);
      }
    } finally {
      setBusy(false);
      abort.current = null;
      save(current);
      loadStatus();
    }
  };

  if (status && !status.active) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-2 bg-[#202124]">
          <Lock size={22} />
        </span>
        <h1 className="mt-5 text-3xl font-normal tracking-tight">Vlipa Code</h1>
        <p className="mt-2 text-muted">
          A fast coding assistant with {CODE_MODELS.map((m) => m.label).join(", ")} — {CODE_PLAN.dailyLimit} messages a day. Get the Code membership to start.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/pricing#code" className="btn btn-primary">
            See the Code plan
          </Link>
          <Link href="/account#billing" className="btn">
            Redeem a code
          </Link>
        </div>
      </div>
    );
  }

  const left = status ? (status.unlimited ? null : Math.max(0, status.limit - status.used)) : null;
  const empty = chat.msgs.length === 0;
  const ultra = !!status?.unlimited || status?.plan === "ultra";
  const current = MODES.find((m) => m.key === mode)!;

  const attach = (f: Attached) => setAttached((a) => [...a.filter((x) => x.path !== f.path), f].slice(-8));
  const newChat = () => {
    if (busy) return;
    setChat(freshChat(chat.model));
    setAttached([]);
    setHistoryOpen(false);
  };

  const composer = (
    <div className="w-full rounded-[26px] border border-white/[0.07] bg-[#232427] shadow-2xl shadow-black/30 transition focus-within:border-white/15">
      {attached.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-4">
          {attached.map((f) => (
            <FileChip key={f.path} path={f.path} onRemove={() => setAttached(attached.filter((x) => x.path !== f.path))} />
          ))}
        </div>
      )}
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(text);
          }
        }}
        rows={empty ? 2 : 1}
        placeholder={empty ? current.placeholder : "Ask a follow-up…"}
        className="block w-full resize-none bg-transparent px-6 pt-5 text-[17px] leading-relaxed outline-none placeholder:text-zinc-500"
      />
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-3 sm:gap-2">
        {gh.target ? (
          <AttachFiles target={gh.target} disabled={busy} onAdd={attach} />
        ) : gh.status?.configured && !gh.connected ? (
          <a href="/api/github/connect" title="Connect GitHub to attach files" className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <Plus size={20} />
          </a>
        ) : null}
        <div className="flex rounded-full bg-black/30 p-1">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] transition ${mode === key ? "bg-[#2f3034] text-white" : "text-zinc-400 hover:text-white"}`}
            >
              <Icon size={15} /> <span className={mode === key ? "" : "hidden sm:inline"}>{label}</span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {left !== null && <span className={`hidden text-xs lg:inline ${left <= 10 ? "text-[#ff9592]" : "text-zinc-500"}`}>{left} left today</span>}
        <ModelMenu value={chat.model} ultra={ultra} onChange={(model) => setChat({ ...chat, model })} />
        {busy ? (
          <button onClick={() => abort.current?.abort()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ececec] text-black" aria-label="Stop">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(text)}
            disabled={!text.trim() || left === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ececec] text-black transition hover:bg-white disabled:opacity-60"
            aria-label="Send"
          >
            <ArrowUp size={19} />
          </button>
        )}
      </div>
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <Code2 size={20} className="text-white" />
        <span className="flex-1 text-[15px] font-medium">Vlipa Code</span>
        <button className="rounded-full p-1.5 text-zinc-400 hover:text-white md:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="px-2">
        <button onClick={newChat} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-zinc-200 transition hover:bg-white/5">
          <Plus size={18} /> New chat
        </button>
      </div>
      <div className="mt-5 px-5 text-[13px] text-zinc-500">Recent</div>
      <div className="mt-1 flex-1 overflow-y-auto px-2 pb-2">
        {chats.length === 0 ? (
          <p className="px-3 py-2 text-[14px] text-zinc-500">No chats yet</p>
        ) : (
          chats.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-xl ${c.id === chat.id ? "bg-white/[0.06]" : "hover:bg-white/5"}`}>
              <button
                className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[14px] text-zinc-300"
                onClick={() => {
                  if (busy) return;
                  setChat(c);
                  setAttached([]);
                  setHistoryOpen(false);
                }}
              >
                {c.title}
              </button>
              <button
                className="mr-1 rounded p-1.5 text-zinc-500 opacity-0 hover:text-[#ff9592] group-hover:opacity-100"
                title="Delete"
                onClick={() => {
                  const list = readChats().filter((x) => x.id !== c.id);
                  writeChats(list);
                  setChats(list);
                  if (c.id === chat.id) setChat(freshChat(chat.model));
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-center border-t border-white/5 p-4">
        <Link href="/pricing#code" className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-[13px] text-zinc-300 transition hover:bg-white/5 hover:text-white">
          View plans
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden bg-[#191a1c]">
      <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-[#1c1d1f] md:block">{sidebar}</aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white md:hidden" onClick={() => setHistoryOpen(true)} aria-label="Chats">
            <History size={18} />
          </button>
          {!empty && (
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white md:hidden" onClick={newChat} aria-label="New chat">
              <Plus size={18} />
            </button>
          )}
          <span className="flex-1" />
          <GithubButton gh={gh} />
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-16">
            <h1 className="text-center text-[34px] font-normal tracking-tight text-zinc-100 sm:text-[44px]">What are we building?</h1>
            <div className="mt-10 w-full max-w-[880px]">{composer}</div>
            <div className="mt-10 grid w-full max-w-[880px] gap-4 sm:grid-cols-2">
              <button
                onClick={() => {
                  setMode("build");
                  inputRef.current?.focus();
                }}
                className="rounded-2xl bg-gradient-to-br from-[#3f8f93] to-[#21575b] p-5 text-left transition hover:brightness-110"
              >
                <div className="flex items-center gap-2.5 text-[17px] font-medium text-white">
                  <PenLine size={19} /> Write and fix code
                </div>
                <p className="mt-2 text-[14.5px] leading-snug text-white/80">Describe a feature or paste an error and get working code in seconds.</p>
              </button>
              <button
                onClick={() => {
                  if (gh.status?.configured && !gh.connected) window.location.href = "/api/github/connect";
                  else inputRef.current?.focus();
                }}
                className="rounded-2xl bg-gradient-to-br from-[#1d3a3d] to-[#141c1e] p-5 text-left transition hover:brightness-125"
              >
                <div className="flex items-center gap-2.5 text-[17px] font-medium text-white">
                  <GitCommitHorizontal size={19} /> Commit straight to GitHub
                  <span className="rounded-md bg-[#5fc7b4]/10 px-1.5 py-0.5 text-[11px] font-normal text-[#5fc7b4]">NEW</span>
                </div>
                <p className="mt-2 text-[14.5px] leading-snug text-white/75">
                  {gh.connected ? "Pick a repository at the top, attach files with + and commit the changes from the chat." : "Connect GitHub, attach repository files and commit the changes in one click."}
                </p>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[820px] space-y-8 px-4 pb-6 pt-4 text-[15px]">
                {chat.msgs.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex flex-col items-end gap-1.5">
                      {m.files && m.files.length > 0 && (
                        <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
                          {m.files.map((f) => (
                            <FileChip key={f} path={f} />
                          ))}
                        </div>
                      )}
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-[#2a2b2f] px-5 py-3">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i}>
                      {!m.error && (
                        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                          <Code2 size={13} /> {CODE_MODELS.find((x) => x.key === m.model)?.label ?? "Vlipa Code"}
                        </div>
                      )}
                      <div className={m.error ? "text-[#ff9592]" : "leading-relaxed text-zinc-200"}>{m.error ? m.content : <Markdown>{m.content}</Markdown>}</div>
                      {!m.error && gh.target && !(busy && i === chat.msgs.length - 1) && (() => {
                        const files = parseFiles(m.content);
                        return files.length > 0 ? <CommitCard files={files} target={gh.target} /> : null;
                      })()}
                    </div>
                  ),
                )}
                {busy && chat.msgs[chat.msgs.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 size={15} className="animate-spin" /> Thinking…
                  </div>
                )}
                <div ref={bottom} />
              </div>
            </div>
            <div className="mx-auto w-full max-w-[880px] px-4 pb-5">{composer}</div>
          </>
        )}
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-white/5 bg-[#1c1d1f] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}
