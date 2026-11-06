"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Bug, Check, ChevronDown, Code2, History, Lightbulb, Loader2, Lock, PenLine, Plus, Square, Trash2, X } from "lucide-react";
import { CODE_MODELS, CODE_PLAN, type CodeModelKey } from "@/lib/plans";
import { Markdown } from "./Markdown";
import { useAutosize } from "./useAutosize";

type Mode = "build" | "debug" | "explain";
type Msg = { role: "user" | "assistant"; content: string; error?: boolean; model?: CodeModelKey };
type Chat = { id: string; title: string; updatedAt: number; model: CodeModelKey; msgs: Msg[] };
type Status = { active: boolean; expires: string | null; used: number; limit: number; unlimited?: boolean };

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

function ModelMenu({ value, onChange }: { value: CodeModelKey; onChange: (k: CodeModelKey) => void }) {
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
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] text-muted transition hover:bg-white/5 hover:text-white">
        {current.label}
        <ChevronDown size={15} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-line-2 bg-[#202124] p-1.5 text-left shadow-2xl shadow-black/50">
          {CODE_MODELS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                onChange(m.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5"
            >
              <span className="flex-1">
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-dim">{m.vendor}</span>
              </span>
              {m.key === value && <Check size={15} />}
            </button>
          ))}
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
    const list = [c, ...readChats().filter((x) => x.id !== c.id)].slice(0, 50);
    writeChats(list);
    setChats(list);
  };

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    const hint = MODES.find((m) => m.key === mode)?.hint;
    const asked = hint && !chat.msgs.length ? `${content}\n\n(${hint})` : content;
    const msgs: Msg[] = [...chat.msgs, { role: "user", content }];
    const apiMsgs = [...chat.msgs.filter((m) => !m.error), { role: "user" as const, content: asked }].map(({ role, content }) => ({ role, content }));
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
        body: JSON.stringify({ model: chat.model, messages: apiMsgs }),
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
  const current = MODES.find((m) => m.key === mode)!;

  const composer = (
    <div className="w-full rounded-[28px] border border-line-2 bg-[#202124] shadow-xl shadow-black/20 transition focus-within:border-[#4a4b50]">
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
        className="block w-full resize-none bg-transparent px-6 pt-5 text-[16px] leading-relaxed outline-none placeholder:text-dim"
      />
      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <div className="flex rounded-full bg-black/25 p-1">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition ${mode === key ? "bg-[#2e2f33] text-white shadow-sm" : "text-muted hover:text-white"}`}
            >
              <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {left !== null && <span className={`hidden text-xs sm:inline ${left <= 10 ? "text-[#ff9592]" : "text-dim"}`}>{left} left today</span>}
        <ModelMenu value={chat.model} onChange={(model) => setChat({ ...chat, model })} />
        {busy ? (
          <button onClick={() => abort.current?.abort()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2e2f33] text-white" aria-label="Stop">
            <Square size={15} />
          </button>
        ) : (
          <button
            onClick={() => send(text)}
            disabled={!text.trim() || left === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ececec] text-black transition hover:bg-white disabled:bg-[#2e2f33] disabled:text-dim"
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden bg-[#18191b]">
      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        <button className="flex h-9 items-center gap-1.5 rounded-full border border-line-2 bg-[#202124] px-3 text-[13px] text-muted hover:text-white" onClick={() => setHistoryOpen(true)}>
          <History size={14} /> History
        </button>
        {!empty && (
          <button className="flex h-9 items-center gap-1.5 rounded-full border border-line-2 bg-[#202124] px-3 text-[13px] text-muted hover:text-white" onClick={() => !busy && setChat(freshChat(chat.model))}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
          <Code2 size={40} strokeWidth={1.5} className="text-white/90" />
          <h1 className="mt-6 text-center text-[32px] font-normal tracking-tight sm:text-[40px]">What are we building today?</h1>
          <div className="mt-10 w-full max-w-[860px]">{composer}</div>
          <div className="mt-5 flex max-w-[860px] flex-wrap justify-center gap-2">
            {SUGGESTIONS[mode].map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-line-2 px-4 py-2 text-[13px] text-muted transition hover:bg-white/5 hover:text-white">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[820px] space-y-8 px-4 pb-6 pt-16 text-[15px]">
              {chat.msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-[#2a2b2f] px-5 py-3">{m.content}</div>
                  </div>
                ) : (
                  <div key={i}>
                    {!m.error && (
                      <div className="mb-2 flex items-center gap-2 text-xs text-dim">
                        <Code2 size={13} /> {CODE_MODELS.find((x) => x.key === m.model)?.label ?? "Vlipa Code"}
                      </div>
                    )}
                    <div className={m.error ? "text-[#ff9592]" : "leading-relaxed text-zinc-200"}>{m.error ? m.content : <Markdown>{m.content}</Markdown>}</div>
                  </div>
                ),
              )}
              {busy && chat.msgs[chat.msgs.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-muted">
                  <Loader2 size={15} className="animate-spin" /> Thinking…
                </div>
              )}
              <div ref={bottom} />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[860px] px-4 pb-5">{composer}</div>
        </>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-line-2 bg-[#1c1d20] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center gap-2 border-b border-line px-4">
              <History size={15} className="text-muted" />
              <span className="flex-1 font-medium">History</span>
              <button
                className="flex h-8 items-center gap-1 rounded-full border border-line-2 px-3 text-xs"
                onClick={() => {
                  setChat(freshChat(chat.model));
                  setHistoryOpen(false);
                }}
              >
                <Plus size={13} /> New
              </button>
              <button className="rounded-full p-1.5 text-muted hover:text-white" onClick={() => setHistoryOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chats.length === 0 ? (
                <p className="p-4 text-center text-sm text-dim">No chats yet.</p>
              ) : (
                chats.map((c) => (
                  <div key={c.id} className={`group flex items-center rounded-xl ${c.id === chat.id ? "bg-white/5" : "hover:bg-white/5"}`}>
                    <button
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      onClick={() => {
                        if (busy) return;
                        setChat(c);
                        setHistoryOpen(false);
                      }}
                    >
                      <div className="truncate text-sm">{c.title}</div>
                      <div className="text-xs text-dim">{new Date(c.updatedAt).toLocaleString()}</div>
                    </button>
                    <button
                      className="mr-1 rounded p-1.5 text-dim opacity-0 hover:text-[#ff9592] group-hover:opacity-100"
                      title="Delete"
                      onClick={() => {
                        const list = readChats().filter((x) => x.id !== c.id);
                        writeChats(list);
                        setChats(list);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
