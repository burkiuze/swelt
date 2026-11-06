"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronRight, Code2, History, Loader2, Lock, Paperclip, Plus, Square, Trash2, X } from "lucide-react";
import { CODE_DEFAULT_MODEL, CODE_EFFORTS, CODE_PLAN, CODE_VENDORS, codeVendorOf, type CodeEffort, type CodeModel } from "@/lib/plans";
import { Markdown } from "./Markdown";
import { useAutosize } from "./useAutosize";
import { AttachFiles, CommitCard, FileChip, GithubButton, parseFiles, useGithub, type Attached } from "./CodeGithub";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean; model?: string; files?: string[]; ctx?: string };
type Chat = { id: string; title: string; updatedAt: number; model: string; msgs: Msg[] };
type Status = { active: boolean; expires: string | null; used: number; limit: number; unlimited?: boolean; plan?: string };

const KEY = "vlipa-code-chats-v1";
const PREF = "vlipa-code-prefs";
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
// Older chats stored short keys ("glm", "minimax"…); anything that isn't a known vendor slug falls back to the default.
const fixModel = (m?: string) => (m && m.includes("/") && codeVendorOf(m) ? m : CODE_DEFAULT_MODEL);
const freshChat = (model = CODE_DEFAULT_MODEL): Chat => ({ id: newId(), title: "New chat", updatedAt: Date.now(), model, msgs: [] });

const EFFORT_LABEL: Record<CodeEffort, string> = { low: "Low", medium: "Medium", high: "High" };

function Logo({ id, size = 20 }: { id: string; size?: number }) {
  const v = codeVendorOf(id);
  if (!v) return <Code2 size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={v.logo} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

function ModelMenu({
  models,
  value,
  onChange,
  effort,
  onEffort,
  ultra,
}: {
  models: CodeModel[];
  value: string;
  onChange: (id: string) => void;
  effort: CodeEffort;
  onEffort: (e: CodeEffort) => void;
  ultra: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const current = models.find((m) => m.id === value);
  const vendors = CODE_VENDORS.map((v) => ({ ...v, models: models.filter((m) => m.vendor === v.key) })).filter((v) => v.models.length);
  const sub = vendors.find((v) => v.key === vendor);

  const modelList = sub && (
    <div className="max-h-[min(28rem,62vh)] overflow-y-auto p-1.5">
      {sub.models.map((m) => {
        const locked = m.max && !ultra;
        const row = (
          <>
            <Logo id={m.id} size={18} />
            <span className={`min-w-0 flex-1 truncate text-[14.5px] ${locked ? "text-zinc-500" : "text-zinc-100"}`}>{m.name}</span>
            {m.isNew && <span className="rounded-md bg-[#5fc7b4]/10 px-1.5 py-0.5 text-[11px] text-[#5fc7b4]">New</span>}
            {m.max && <span className="rounded-md bg-[#5fc7b4]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#5fc7b4]">Max</span>}
            {locked ? <Lock size={14} className="text-zinc-500" /> : m.id === value ? <Check size={15} /> : null}
          </>
        );
        const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5";
        return locked ? (
          <Link key={m.id} href="/pricing" className={cls} title="Max models need the Ultra plan">
            {row}
          </Link>
        ) : (
          <button
            key={m.id}
            type="button"
            className={cls}
            onClick={() => {
              onChange(m.id);
              setOpen(false);
              setVendor(null);
            }}
          >
            {row}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setVendor(null);
        }}
        className={`flex h-11 max-w-[55vw] items-center gap-2 rounded-full px-4 text-[14.5px] transition sm:max-w-none ${open ? "bg-[#34363a]" : "bg-[#323437] hover:bg-[#383a3e]"}`}
      >
        <Logo id={value} size={18} />
        <span className="truncate text-zinc-100">{current?.name ?? "Model"}</span>
        {current?.reasoning && <span className="hidden text-zinc-500 sm:inline">{EFFORT_LABEL[effort]}</span>}
        <ChevronDown size={15} className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(21rem,calc(100vw-2rem))]">
          {/* Desktop: the vendor's models fly out to the left. */}
          {sub && <div className="absolute bottom-0 right-full mr-2 hidden w-80 rounded-[20px] border border-white/[0.07] bg-[#27292c] shadow-2xl shadow-black/60 sm:block">{modelList}</div>}

          <div className="relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#27292c] shadow-2xl shadow-black/60">
            {/* Mobile: the model list replaces the vendor list. */}
            {sub && (
              <div className="absolute inset-0 z-10 flex flex-col bg-[#27292c] sm:hidden">
                <button className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-[14px] text-zinc-300" onClick={() => setVendor(null)}>
                  <ArrowLeft size={16} /> {sub.label}
                </button>
                <div className="flex-1 overflow-y-auto">{modelList}</div>
              </div>
            )}
            <div className="px-4 pb-2 pt-4 text-[14px] font-medium text-zinc-400">Model</div>
            {!ultra && (
              <Link href="/pricing" className="mx-2 mb-1 flex items-center justify-between rounded-2xl border border-[#5fc7b4]/20 bg-[#5fc7b4]/[0.07] px-4 py-3 text-[14px] text-zinc-300 transition hover:bg-[#5fc7b4]/[0.12]">
                Get access to the best models <ArrowRight size={16} className="text-[#5fc7b4]" />
              </Link>
            )}
            <div className="max-h-[min(22rem,50vh)] overflow-y-auto p-1.5">
              {vendors.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onMouseEnter={() => window.matchMedia("(min-width: 640px)").matches && setVendor(v.key)}
                  onClick={() => setVendor(v.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${vendor === v.key ? "bg-white/[0.06]" : "hover:bg-white/5"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
                  <span className="flex-1 text-[15px] text-zinc-100">{v.label}</span>
                  <span className="text-xs text-zinc-500">{v.models.length}</span>
                  <ChevronRight size={15} className="text-zinc-500" />
                </button>
              ))}
              {vendors.length === 0 && (
                <p className="flex items-center gap-2 px-3 py-3 text-sm text-zinc-400">
                  <Loader2 size={14} className="animate-spin" /> Loading models…
                </p>
              )}
            </div>
            {current?.reasoning && (
              <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
                <span className="flex-1 text-[13px] text-zinc-400">Thinking</span>
                <div className="flex rounded-full bg-black/30 p-0.5">
                  {CODE_EFFORTS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => onEffort(e)}
                      className={`rounded-full px-3 py-1 text-[12.5px] transition ${effort === e ? "bg-[#3a3c40] text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                      {EFFORT_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CodeChat() {
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<CodeModel[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chat, setChat] = useState<Chat>(() => freshChat());
  const [effort, setEffortState] = useState<CodeEffort>("medium");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attached, setAttached] = useState<Attached[]>([]);
  const [pending, setPending] = useState<string | null>(null);
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
    let prefs: { model?: string; effort?: CodeEffort } = {};
    try {
      prefs = JSON.parse(localStorage.getItem(PREF) || "{}");
    } catch {}
    if (prefs.model) setChat((c) => ({ ...c, model: fixModel(prefs.model) }));
    if (prefs.effort && CODE_EFFORTS.includes(prefs.effort)) setEffortState(prefs.effort);
    fetch("/api/code/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
    // Prompt handed over from the home page (?q=…): sent once the membership check passes.
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setPending(q);
      window.history.replaceState(null, "", "/code");
    }
  }, [loadStatus]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat.msgs]);

  const savePrefs = (p: { model?: string; effort?: CodeEffort }) => {
    try {
      localStorage.setItem(PREF, JSON.stringify({ model: chat.model, effort, ...p }));
    } catch {}
  };
  const setModel = (model: string) => {
    setChat((c) => ({ ...c, model }));
    savePrefs({ model });
  };
  const setEffort = (e: CodeEffort) => {
    setEffortState(e);
    savePrefs({ effort: e });
  };

  const save = (c: Chat) => {
    if (!c.msgs.length) return;
    c = { ...c, msgs: c.msgs.map((m) => (m.ctx && m.ctx.length > 60_000 ? { ...m, ctx: m.ctx.slice(0, 60_000) } : m)) };
    const list = [c, ...readChats().filter((x) => x.id !== c.id)].slice(0, 50);
    writeChats(list);
    setChats(list);
  };

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    const ctx = attached.map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");
    const msgs: Msg[] = [...chat.msgs, { role: "user", content, ...(attached.length ? { files: attached.map((f) => f.path), ctx } : {}) }];
    const apiMsgs = [
      ...chat.msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.ctx ? `${m.content}\n\n${m.ctx}` : m.content })),
      { role: "user" as const, content: ctx ? `${content}\n\n${ctx}` : content },
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
        body: JSON.stringify({ model: chat.model, effort, messages: apiMsgs, repo: gh.target?.repo, branch: gh.target?.branch }),
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

  useEffect(() => {
    if (pending && status?.active && !busy) {
      const q = pending;
      setPending(null);
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, status?.active]);

  if (status && !status.active) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line-2 bg-[#202124]">
          <Lock size={22} />
        </span>
        <h1 className="mt-5 text-3xl font-normal tracking-tight">Vlipa Code</h1>
        <p className="mt-2 text-muted">
          A coding assistant with text models from {CODE_VENDORS.map((v) => v.label).join(", ")} — {CODE_PLAN.dailyLimit} messages a day. Get the Code membership to start.
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
  const modelName = (id?: string) => models.find((m) => m.id === id)?.name ?? id?.split("/")[1] ?? "Vlipa Code";
  const newChat = () => {
    if (busy) return;
    setChat(freshChat(chat.model));
    setAttached([]);
    setHistoryOpen(false);
  };

  const composer = (
    <div className="w-full rounded-[28px] border border-white/[0.06] bg-[#2a2c2f] shadow-2xl shadow-black/30 transition focus-within:border-white/[0.12]">
      {attached.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-6 pt-4">
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
        placeholder={empty ? "Ask anything…" : "Ask a follow-up…"}
        className="block w-full resize-none bg-transparent px-7 pt-6 text-[17px] leading-relaxed outline-none placeholder:text-zinc-500"
      />
      <div className="flex items-center gap-1 px-4 pb-4 pt-3">
        {gh.target ? (
          <AttachFiles target={gh.target} disabled={busy} onAdd={(f) => setAttached((a) => [...a.filter((x) => x.path !== f.path), f].slice(-8))} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-600" title="Connect GitHub and pick a repository to attach files">
            <Paperclip size={19} />
          </span>
        )}
        <GithubButton gh={gh} compact />
        <span className="flex-1" />
        {left !== null && <span className={`mr-2 hidden text-xs lg:inline ${left <= 10 ? "text-[#ff9592]" : "text-zinc-500"}`}>{left} left today</span>}
        <ModelMenu models={models} value={chat.model} onChange={setModel} effort={effort} onEffort={setEffort} ultra={ultra} />
        {busy ? (
          <button onClick={() => abort.current?.abort()} className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3fa591] text-white" aria-label="Stop">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => send(text)}
            disabled={!text.trim() || left === 0}
            className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3fa591] text-white transition hover:bg-[#48b39e] disabled:opacity-60"
            aria-label="Send"
          >
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="flex-1 text-[19px] font-semibold tracking-tight">vlipa</span>
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
                  setChat({ ...c, model: fixModel(c.model) });
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
        <Link href="/pricing#code" className="rounded-full border border-white/10 px-4 py-1.5 text-[13px] text-zinc-300 transition hover:bg-white/5 hover:text-white">
          View plans
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden bg-[#1f2023]">
      <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-[#191a1c] md:block">{sidebar}</aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-1 px-3 md:hidden">
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white" onClick={() => setHistoryOpen(true)} aria-label="Chats">
            <History size={18} />
          </button>
          {!empty && (
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white" onClick={newChat} aria-label="New chat">
              <Plus size={18} />
            </button>
          )}
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-24">
            <h1 className="select-none text-center text-[56px] font-medium leading-none tracking-[-0.04em] text-[#e9e7e4] sm:text-[72px]">vlipa</h1>
            <div className="mt-10 w-full max-w-[900px]">{composer}</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[820px] space-y-8 px-4 pb-6 pt-6 text-[15px]">
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
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-[#2e3033] px-5 py-3">{m.content}</div>
                    </div>
                  ) : (
                    <div key={i}>
                      {!m.error && (
                        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                          <Logo id={m.model ?? ""} size={14} /> {modelName(m.model)}
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
            <div className="mx-auto w-full max-w-[900px] px-4 pb-5">{composer}</div>
          </>
        )}
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-white/5 bg-[#191a1c] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}
