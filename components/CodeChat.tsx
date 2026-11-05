"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Code2, Loader2, Lock, MessageSquare, Plus, Square, Trash2 } from "lucide-react";
import { CODE_MODELS, CODE_PLAN, type CodeModelKey } from "@/lib/plans";
import { Markdown } from "./Markdown";
import { useAutosize } from "./useAutosize";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };
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

const SUGGESTIONS = [
  "Write a Python script that renames all photos in a folder by their EXIF date",
  "Explain this error and fix it: TypeError: Cannot read properties of undefined (reading 'map')",
  "Create a responsive pricing section with Tailwind CSS",
  "Write a SQL query for monthly revenue per customer with a running total",
];

export function CodeChat() {
  const [status, setStatus] = useState<Status | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chat, setChat] = useState<Chat>(() => ({ id: newId(), title: "New chat", updatedAt: Date.now(), model: "minimax", msgs: [] }));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useAutosize(text, 240);

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
    const msgs: Msg[] = [...chat.msgs, { role: "user", content }];
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
        body: JSON.stringify({ model: chat.model, messages: msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
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
        current = { ...current, msgs: [...msgs, { role: "assistant", content: answer }] };
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
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel-2">
          <Lock size={20} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Vlipa Code</h1>
        <p className="mt-2 text-muted">
          A fast coding assistant with MiniMax M3.1 Flash, DeepSeek V4.1 Flash and GLM 5.3 Flash — {CODE_PLAN.dailyLimit} messages a day. Get the Code membership to start.
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

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line md:flex">
        <div className="p-2">
          <button className="btn w-full justify-center" onClick={() => setChat({ id: newId(), title: "New chat", updatedAt: Date.now(), model: chat.model, msgs: [] })}>
            <Plus size={14} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {chats.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-md ${c.id === chat.id ? "bg-panel-2" : "hover:bg-panel-2"}`}>
              <button className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm" onClick={() => !busy && setChat(c)}>
                <MessageSquare size={13} className="mr-2 inline text-dim" />
                {c.title}
              </button>
              <button
                className="mr-1 rounded p-1 text-dim opacity-0 hover:text-[#ff9592] group-hover:opacity-100"
                title="Delete"
                onClick={() => {
                  const list = readChats().filter((x) => x.id !== c.id);
                  writeChats(list);
                  setChats(list);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4 text-sm">
          <Code2 size={15} className="text-muted" />
          <span className="min-w-0 flex-1 truncate font-medium">{chat.msgs.length ? chat.title : "Vlipa Code"}</span>
          {left !== null && (
            <span className={`text-xs ${left <= 10 ? "text-[#ff9592]" : "text-dim"}`}>
              {left}/{status?.limit} messages left today
            </span>
          )}
          <button className="btn h-8 md:hidden" onClick={() => setChat({ id: newId(), title: "New chat", updatedAt: Date.now(), model: chat.model, msgs: [] })}>
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[820px] space-y-6 px-4 py-6 text-sm">
            {chat.msgs.length === 0 && (
              <div className="pt-10 text-center">
                <h1 className="text-2xl font-semibold">What are we building?</h1>
                <p className="mt-1.5 text-muted">Ask anything about code. Answers stream in as they are written.</p>
                <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border border-line-2 bg-panel p-3 text-left text-[13px] text-muted transition hover:bg-panel-2 hover:text-white">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-panel-2 px-3 py-2">{m.content}</div>
                </div>
              ) : (
                <div key={i} className={m.error ? "text-[#ff9592]" : "leading-relaxed text-zinc-200"}>
                  {m.error ? m.content : <Markdown>{m.content}</Markdown>}
                </div>
              ),
            )}
            {busy && chat.msgs[chat.msgs.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[820px] px-4 pb-4">
          <div className="rounded-xl border border-line-2 bg-[#1e1e1e]">
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
              rows={2}
              placeholder="Ask about code, paste an error or a snippet…"
              className="block w-full resize-none bg-transparent px-4 pt-3 font-mono text-[13px] leading-relaxed outline-none placeholder:font-sans placeholder:text-dim"
            />
            <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
              <select
                value={chat.model}
                onChange={(e) => setChat({ ...chat, model: e.target.value as CodeModelKey })}
                className="h-8 rounded-md border border-line-2 bg-transparent px-2 text-[13px] text-white outline-none"
                title="Model"
              >
                {CODE_MODELS.map((m) => (
                  <option key={m.key} value={m.key} className="bg-[#1e1e1e]">
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="flex-1" />
              {busy ? (
                <button onClick={() => abort.current?.abort()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2c2c] text-white" aria-label="Stop">
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={() => send(text)}
                  disabled={!text.trim() || left === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ededed] text-black transition hover:bg-white disabled:bg-[#2c2c2c] disabled:text-dim"
                  aria-label="Send"
                >
                  <ArrowUp size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
