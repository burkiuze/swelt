"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CODE_PLAN, PLANS } from "@/lib/plans";
import { creditsLabel } from "@/lib/credits";
import { Check, Copy, Download, Trash2 } from "lucide-react";

type Code = {
  code: string;
  credits: number;
  note: string | null;
  created_at: string;
  redeemed_by: string | null;
  redeemed_email: string | null;
  redeemed_at: string | null;
};

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />} {label}
    </button>
  );
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "");

export function CodesAdmin() {
  const [items, setItems] = useState<Code[]>([]);
  const [count, setCount] = useState(10);
  const [credits, setCredits] = useState(20);
  const [plan, setPlan] = useState<"" | "premium" | "pro" | "ultra" | "code">("pro");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "unused" | "used">("unused");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/codes");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error || "Failed to load codes");
    setItems(d.items || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count, credits, note, plan: plan || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to create codes");
      setFresh(d.codes);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete ${code}?`)) return;
    await fetch("/api/admin/codes", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    load();
  }

  const shown = useMemo(
    () => items.filter((c) => (filter === "all" ? true : filter === "used" ? !!c.redeemed_by : !c.redeemed_by)),
    [items, filter],
  );
  const used = items.filter((c) => c.redeemed_by).length;

  function exportCsv() {
    const rows = [["code", "credits", "note", "created_at", "redeemed_email", "redeemed_at"], ...shown.map((c) => [c.code, String(c.credits), c.note || "", c.created_at, c.redeemed_email || "", c.redeemed_at || ""])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vlipa-codes-${filter}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Redeem codes</h1>
        <p className="mt-1 text-sm text-muted">Create single-use codes that add credits. Buyers redeem them on their Account page.</p>
      </div>

      <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-[150px_90px_110px_1fr_auto] sm:items-end">
        <label className="text-xs text-dim">
          Package
          <select
            value={plan}
            onChange={(e) => {
              const v = e.target.value as typeof plan;
              setPlan(v);
              const p = PLANS.find((x) => x.key === v);
              if (p) setCredits(p.credits);
            }}
            className="input mt-1 h-8"
          >
            {PLANS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} (${p.price})
              </option>
            ))}
            <option value="code">Code (${CODE_PLAN.price}, {CODE_PLAN.dailyLimit} msg/day)</option>
            <option value="">Credits only</option>
          </select>
        </label>
        <label className="text-xs text-dim">
          Count
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input mt-1 h-8" />
        </label>
        <label className="text-xs text-dim">
          Credits ($ · 1$ = 1,000 cr)
          <input type="number" min={0.01} step={0.01} value={credits} onChange={(e) => setCredits(Number(e.target.value))} className="input mt-1 h-8" />
        </label>
        <label className="text-xs text-dim">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. itemsatis batch 1" className="input mt-1 h-8" />
        </label>
        <button className="btn btn-primary justify-center" disabled={busy}>
          {busy ? "Creating…" : "Create codes"}
        </button>
      </form>
      {err && <p className="text-sm text-[#ff9592]">{err}</p>}

      {fresh.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-medium">{fresh.length} new codes</div>
            <CopyBtn text={fresh.join("\n")} label="Copy all" />
          </div>
          <pre className="max-h-60 overflow-auto rounded-md bg-[#151515] p-3 font-mono text-xs leading-6">{fresh.join("\n")}</pre>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 text-sm">
          {(["unused", "used", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-2.5 py-1 capitalize ${filter === f ? "bg-panel-2 text-white" : "text-muted hover:text-white"}`}>
              {f}
            </button>
          ))}
          <span className="text-xs text-dim">
            {items.length - used} unused · {used} used
          </span>
          <button onClick={exportCsv} className="btn ml-auto">
            <Download size={13} /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-dim">
              <tr>
                <th className="px-3 py-2 font-normal">Code</th>
                <th className="px-3 py-2 font-normal">Credits</th>
                <th className="px-3 py-2 font-normal">Note</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.code} className="border-t border-line">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2">{creditsLabel(Number(c.credits))}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-muted">{c.note}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {c.redeemed_by ? (
                      <span className="text-muted" title={fmt(c.redeemed_at)}>
                        Used by {c.redeemed_email || c.redeemed_by}
                      </span>
                    ) : (
                      <span className="text-[#4cc38a]">Unused</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {!c.redeemed_by && (
                      <span className="inline-flex gap-1">
                        <CopyBtn text={c.code} />
                        <button className="btn" onClick={() => remove(c.code)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-dim">
                    No codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
