"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";

type Key = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null };

export function Keys() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const load = () =>
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.items || []))
      .catch(() => setKeys([]));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setErr("");
    const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error || "Failed");
    setFresh(d.key);
    setName("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">API Keys</h1>
        <p className="mt-1 text-muted">Use keys to call any Swelt model from your code: <code className="text-zinc-300">Authorization: Key swk_…</code></p>
      </div>
      <div className="card flex flex-wrap gap-2 p-4">
        <input className="input max-w-sm flex-1" placeholder="Key name, e.g. production" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" onClick={create}><KeyRound size={14} /> Create key</button>
        {err && <span className="text-sm text-rose-300">{err}</span>}
      </div>
      {fresh && (
        <div className="card space-y-2 border-emerald-500/40 p-4">
          <div className="text-sm font-medium text-emerald-300">Copy your key now — it won&apos;t be shown again.</div>
          <div className="flex gap-2">
            <code className="input overflow-x-auto whitespace-nowrap font-mono">{fresh}</code>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        {keys === null ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-muted">No keys yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line"><th className="p-3">Name</th><th className="p-3">Key</th><th className="p-3">Created</th><th className="p-3">Last used</th><th /></tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-line last:border-0">
                  <td className="p-3">{k.name}</td>
                  <td className="p-3 font-mono text-muted">{k.prefix}…</td>
                  <td className="p-3 text-muted">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-muted">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</td>
                  <td className="p-3 text-right">
                    <button className="btn" onClick={async () => { if (confirm(`Revoke "${k.name}"?`)) { await fetch(`/api/keys?id=${k.id}`, { method: "DELETE" }); load(); } }}>
                      <Trash2 size={14} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
