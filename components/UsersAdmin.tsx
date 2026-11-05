"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search, Ticket } from "lucide-react";
import { fmtCredits } from "@/lib/credits";

type Row = {
  user_id: string;
  provider: string | null;
  email: string | null;
  username: string;
  credits: number;
  plan: "free" | "premium" | "pro" | "ultra" | "admin";
  expires: string | null;
  days_left: number | null;
  codes_redeemed: number;
  created_at: string;
};

const PLAN_STYLE: Record<Row["plan"], string> = {
  free: "bg-panel-2 text-muted",
  premium: "bg-[#22c55e]/15 text-[#4ade80]",
  pro: "bg-[#3b82f6]/15 text-[#7dd3fc]",
  ultra: "bg-[#f59e0b]/15 text-[#fbbf24]",
  admin: "bg-[#e5484d]/15 text-[#ff9592]",
};

export function UsersAdmin() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "free">("all");

  const load = async () => {
    setErr("");
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(d.error || `HTTP ${r.status}`);
      setItems([]);
      return;
    }
    setItems(d.items || []);
  };
  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter(
      (u) =>
        (filter === "all" || (filter === "paid" ? ["premium", "pro", "ultra"].includes(u.plan) : u.plan === "free")) &&
        (!s || `${u.email ?? ""} ${u.username}`.toLowerCase().includes(s)),
    );
  }, [items, q, filter]);

  const count = (p: Row["plan"]) => (items ?? []).filter((u) => u.plan === p).length;

  const exportCsv = () => {
    const rows = [
      ["email", "username", "plan", "credits", "days_left", "plan_expires", "codes_redeemed", "joined"],
      ...shown.map((u) => [u.email ?? "", u.username, u.plan, String(Math.round(u.credits * 1000)), u.days_left == null ? "" : String(u.days_left), u.expires ?? "", String(u.codes_redeemed), u.created_at]),
    ];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vlipa-users.csv";
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted">Every account with its plan, credits and days left.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/codes" className="btn">
            <Ticket size={14} /> Codes
          </Link>
          <button className="btn" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn" onClick={exportCsv} disabled={!shown.length}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Users", items?.length ?? 0],
          ["Premium", count("premium")],
          ["Pro", count("pro")],
          ["Ultra", count("ultra")],
          ["Free", count("free")],
        ].map(([label, n]) => (
          <div key={label as string} className="card p-3">
            <div className="text-xs text-dim">{label}</div>
            <div className="mt-1 text-xl font-semibold">{items ? n : "—"}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or username" className="input h-8 pl-8" />
        </div>
        {(["all", "paid", "free"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`h-8 rounded-md px-3 text-sm capitalize ${filter === f ? "bg-panel-2 text-white" : "text-muted hover:text-white"}`}>
            {f}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-[#ff9592]">{err}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-dim">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-normal">Email</th>
              <th className="px-3 py-2 font-normal">Username</th>
              <th className="px-3 py-2 font-normal">Plan</th>
              <th className="px-3 py-2 text-right font-normal">Credits</th>
              <th className="px-3 py-2 text-right font-normal">Days left</th>
              <th className="px-3 py-2 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-dim">
                  Loading…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-dim">
                  No users.
                </td>
              </tr>
            ) : (
              shown.map((u) => (
                <tr key={u.user_id} className="border-b border-line last:border-0">
                  <td className="max-w-[260px] truncate px-3 py-2">{u.email ?? <span className="text-dim">—</span>}</td>
                  <td className="px-3 py-2 text-muted">
                    {u.username}
                    {u.provider && <span className="ml-1.5 text-[11px] text-dim">({u.provider})</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${PLAN_STYLE[u.plan]}`}>{u.plan}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.plan === "admin" ? "∞" : fmtCredits(u.credits)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {u.days_left == null ? <span className="text-dim">—</span> : <span className={u.days_left <= 2 ? "text-[#ff9592]" : ""}>{u.days_left} days</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-dim">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
