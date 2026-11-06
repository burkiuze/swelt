"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, FileCode2, GitBranch, GitCommitHorizontal, Loader2, LogOut, Plus, Search, X } from "lucide-react";

export type GhRepo = { repo: string; branch: string };
type Status = { configured: boolean; connected: boolean; login: string | null; installUrl: string | null };
export type Attached = { path: string; content: string };

const REPO_KEY = "vlipa-code-repo";

function Github({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function useGithub() {
  const [status, setStatus] = useState<Status | null>(null);
  const [target, setTargetState] = useState<GhRepo | null>(null);
  const load = useCallback(() => {
    fetch("/api/github", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  useEffect(() => {
    load();
    try {
      const t = JSON.parse(localStorage.getItem(REPO_KEY) || "null");
      if (t?.repo && t?.branch) setTargetState(t);
    } catch {}
  }, [load]);
  const setTarget = (t: GhRepo | null) => {
    setTargetState(t);
    try {
      if (t) localStorage.setItem(REPO_KEY, JSON.stringify(t));
      else localStorage.removeItem(REPO_KEY);
    } catch {}
  };
  const connected = !!status?.connected;
  return { status, reload: load, target: connected ? target : null, setTarget, connected };
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return { open, setOpen, ref };
}

const pill = "flex h-9 items-center gap-1.5 rounded-full border border-line-2 bg-[#202124] px-3 text-[13px] text-muted transition hover:text-white";

/** Top-bar GitHub control: connect, pick repository + branch, disconnect. */
export function GithubButton({ gh, compact }: { gh: ReturnType<typeof useGithub>; compact?: boolean }) {
  const { open, setOpen, ref } = usePopover();
  const [repos, setRepos] = useState<{ full_name: string; default_branch: string; private: boolean }[] | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !gh.connected || repos) return;
    fetch("/api/github/repos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setRepos(d.repos)))
      .catch(() => setErr("Couldn't load repositories."));
  }, [open, gh.connected, repos]);

  useEffect(() => {
    if (!open || !gh.target) return;
    fetch(`/api/github/tree?repo=${encodeURIComponent(gh.target.repo)}&ref=${encodeURIComponent(gh.target.branch)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBranches(d.branches ?? []))
      .catch(() => {});
  }, [open, gh.target]);

  const icon = "flex h-10 items-center gap-1.5 rounded-full px-2.5 text-zinc-400 transition hover:bg-white/5 hover:text-white";
  if (!gh.status?.configured) return null;
  if (!gh.connected) {
    return (
      <a href="/api/github/connect" className={compact ? icon : pill} title="Connect GitHub">
        <Github size={compact ? 20 : 14} /> {!compact && "Connect GitHub"}
      </a>
    );
  }
  return (
    <div ref={ref} className="relative">
      <button className={compact ? icon : pill} onClick={() => setOpen((o) => !o)} title="GitHub repository">
        <Github size={compact ? 20 : 14} />
        {(!compact || gh.target) && <span className={`max-w-[140px] truncate ${compact ? "text-[13px]" : ""}`}>{gh.target ? gh.target.repo.split("/")[1] : "Pick a repository"}</span>}
        {gh.target && !compact && (
          <span className="hidden items-center gap-1 text-dim sm:flex">
            <GitBranch size={12} /> {gh.target.branch}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute left-0 z-50 w-80 overflow-hidden rounded-2xl border border-line-2 bg-[#1e1f22] p-1.5 shadow-2xl shadow-black/50 ${compact ? "bottom-full mb-2" : "top-full mt-2"}`}>
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-dim">
            <Github size={13} /> Signed in as <span className="text-white">{gh.status.login}</span>
            <span className="flex-1" />
            <button
              className="flex items-center gap-1 hover:text-[#ff9592]"
              onClick={async () => {
                await fetch("/api/github", { method: "DELETE" });
                gh.setTarget(null);
                gh.reload();
                setOpen(false);
              }}
            >
              <LogOut size={12} /> Disconnect
            </button>
          </div>
          {gh.target && branches.length > 0 && (
            <div className="px-3 pb-2">
              <label className="text-[11px] uppercase tracking-wide text-dim">Branch</label>
              <select
                value={gh.target.branch}
                onChange={(e) => gh.setTarget({ ...gh.target!, branch: e.target.value })}
                className="mt-1 w-full rounded-lg border border-line-2 bg-[#202124] px-2 py-1.5 text-sm"
              >
                {(branches.includes(gh.target.branch) ? branches : [gh.target.branch, ...branches]).map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto border-t border-line pt-1">
            {err && <p className="px-3 py-2 text-sm text-[#ff9592]">{err}</p>}
            {!repos && !err && (
              <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" /> Loading repositories…
              </p>
            )}
            {repos?.map((r) => (
              <button
                key={r.full_name}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => {
                  gh.setTarget({ repo: r.full_name, branch: r.default_branch });
                  setBranches([]);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{r.full_name}</span>
                {r.private && <span className="rounded bg-white/5 px-1.5 text-[10px] text-dim">private</span>}
                {gh.target?.repo === r.full_name && <Check size={14} />}
              </button>
            ))}
            {repos && repos.length === 0 && <p className="px-3 py-2 text-sm text-muted">No repositories yet. Install the Vlipa Code bot on the ones you want to use.</p>}
          </div>
          {gh.status.installUrl && (
            <a href={gh.status.installUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-xl border-t border-line px-3 py-2.5 text-sm text-[#7dd3c0] hover:bg-white/5">
              <ExternalLink size={14} /> Add or remove repositories
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** "Attach files" picker for the composer. */
export function AttachFiles({ target, onAdd, disabled }: { target: GhRepo; onAdd: (f: Attached) => void; disabled?: boolean }) {
  const { open, setOpen, ref } = usePopover();
  const [paths, setPaths] = useState<string[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => setPaths(null), [target.repo, target.branch]);
  useEffect(() => {
    if (!open || paths) return;
    fetch(`/api/github/tree?repo=${encodeURIComponent(target.repo)}&ref=${encodeURIComponent(target.branch)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setPaths(d.paths)))
      .catch(() => setErr("Couldn't load files."));
  }, [open, paths, target]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (paths ?? []).filter((p) => !t || p.toLowerCase().includes(t)).slice(0, 80);
  }, [paths, q]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        title="Attach files from the repository"
      >
        <Plus size={20} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-line-2 bg-[#1e1f22] shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            <Search size={14} className="text-dim" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${target.repo.split("/")[1]}…`} className="flex-1 bg-transparent text-sm outline-none placeholder:text-dim" />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {err && <p className="px-2 py-2 text-sm text-[#ff9592]">{err}</p>}
            {!paths && !err && (
              <p className="flex items-center gap-2 px-2 py-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" /> Loading files…
              </p>
            )}
            {shown.map((p) => (
              <button
                key={p}
                disabled={!!loading}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-white/5"
                onClick={async () => {
                  setLoading(p);
                  const d = await fetch(`/api/github/file?repo=${encodeURIComponent(target.repo)}&ref=${encodeURIComponent(target.branch)}&path=${encodeURIComponent(p)}`)
                    .then((r) => r.json())
                    .catch(() => ({ error: "Couldn't load the file." }));
                  setLoading("");
                  if (d.error) setErr(d.error);
                  else {
                    onAdd({ path: p, content: d.content });
                    setOpen(false);
                  }
                }}
              >
                {loading === p ? <Loader2 size={13} className="animate-spin" /> : <FileCode2 size={13} className="text-dim" />}
                <span className="truncate">{p}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Files the assistant wrote in ```lang path=... blocks. */
export function parseFiles(md: string): Attached[] {
  const out = new Map<string, string>();
  const re = /```[\w+#.-]*[ \t]+path=([^\s`]+)[^\n]*\n([\s\S]*?)\n```/g;
  for (let m; (m = re.exec(md)); ) out.set(m[1].replace(/^\.?\//, ""), m[2] + "\n");
  return [...out].map(([path, content]) => ({ path, content }));
}

/** Commit card under an assistant answer that contains files. */
export function CommitCard({ files, target }: { files: Attached[]; target: GhRepo }) {
  const [message, setMessage] = useState(`Update ${files.length === 1 ? files[0].path.split("/").pop() : `${files.length} files`} via Vlipa Code`);
  const [branch, setBranch] = useState(target.branch);
  const [picked, setPicked] = useState(() => new Set(files.map((f) => f.path)));
  const [state, setState] = useState<{ busy?: boolean; url?: string; error?: string }>({});
  return (
    <div className="mt-3 rounded-2xl border border-line-2 bg-[#1e1f22] p-3 text-sm">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <GitCommitHorizontal size={15} /> Commit to <span className="text-white">{target.repo}</span>
      </div>
      <div className="mt-2 space-y-1">
        {files.map((f) => (
          <label key={f.path} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={picked.has(f.path)}
              onChange={(e) => {
                const n = new Set(picked);
                if (e.target.checked) n.add(f.path);
                else n.delete(f.path);
                setPicked(n);
              }}
            />
            <FileCode2 size={13} className="text-dim" /> <span className="truncate">{f.path}</span>
          </label>
        ))}
      </div>
      {state.url ? (
        <a href={state.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-[#7ee2a8] hover:underline">
          <Check size={14} /> Committed — view on GitHub <ExternalLink size={12} />
        </a>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line-2 bg-[#18191b] px-3 py-2 text-[13px] outline-none" placeholder="Commit message" />
          <div className="flex gap-2">
            <span className="flex items-center gap-1 rounded-lg border border-line-2 bg-[#18191b] px-2">
              <GitBranch size={13} className="text-dim" />
              <input value={branch} onChange={(e) => setBranch(e.target.value.trim())} className="w-28 bg-transparent py-2 text-[13px] outline-none" title="Branch (a new name creates the branch)" />
            </span>
            <button
              disabled={state.busy || !picked.size || !branch}
              onClick={async () => {
                setState({ busy: true });
                const d = await fetch("/api/github/commit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ repo: target.repo, branch, base: target.branch, message, files: files.filter((f) => picked.has(f.path)) }),
                })
                  .then((r) => r.json())
                  .catch(() => ({ error: "Connection lost, try again." }));
                setState(d.error ? { error: d.error } : { url: d.url });
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#ececec] px-3 py-2 text-[13px] font-medium text-black hover:bg-white disabled:opacity-50"
            >
              {state.busy ? <Loader2 size={14} className="animate-spin" /> : <GitCommitHorizontal size={14} />} Commit
            </button>
          </div>
        </div>
      )}
      {state.error && <p className="mt-2 text-[13px] text-[#ff9592]">{state.error}</p>}
    </div>
  );
}

export function FileChip({ path, onRemove }: { path: string; onRemove?: () => void }) {
  return (
    <span className="flex max-w-[240px] items-center gap-1.5 rounded-full border border-line-2 bg-[#2a2b2f] py-1 pl-2.5 pr-1.5 text-xs">
      <FileCode2 size={12} className="shrink-0 text-dim" />
      <span className="truncate">{path.split("/").pop()}</span>
      {onRemove && (
        <button onClick={onRemove} className="rounded-full p-0.5 text-dim hover:text-white" aria-label="Remove">
          <X size={12} />
        </button>
      )}
    </span>
  );
}
