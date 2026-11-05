import { redirect } from "next/navigation";
import { getCaller } from "@/lib/auth";
import { dbEnabled, listGenerations, stats } from "@/lib/db";

export const metadata = { title: "Usage — Swelt" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const caller = await getCaller();
  if (!caller) redirect("/sign-in");
  const s = dbEnabled() ? await stats(caller.userId) : null;
  const rows = dbEnabled() ? await listGenerations(caller.userId, 100, null) : [];
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-7">
      <h1 className="text-3xl font-semibold">Usage & credits</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-muted">Balance</div>
          <div className="mt-1 text-2xl font-semibold">{caller.isAdmin ? "Unlimited" : `$${Number(caller.profile?.credits ?? 0).toFixed(2)}`}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Spend (7 days)</div>
          <div className="mt-1 text-2xl font-semibold">${Number(s?.cost_7d ?? 0).toFixed(2)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Requests / errors (7 days)</div>
          <div className="mt-1 text-2xl font-semibold">{s?.requests_7d ?? 0} / {s?.errors_7d ?? 0}</div>
        </div>
      </div>
      <p className="text-sm text-muted">New accounts start with ${Number(process.env.FREE_CREDITS ?? 1).toFixed(2)} of free credits. Each run is charged the cost reported by the provider (or the listed estimate).</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-line"><th className="p-3">Time</th><th className="p-3">Model</th><th className="p-3">Source</th><th className="p-3">Status</th><th className="p-3 text-right">Cost</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="p-3 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">{r.model_id}</td>
                <td className="p-3 text-muted">{r.source}</td>
                <td className={`p-3 ${r.status === "FAILED" ? "text-[#ff9592]" : r.status === "COMPLETED" ? "text-[#4ade80]" : "text-muted"}`} title={r.error ?? ""}>{r.status}</td>
                <td className="p-3 text-right">${Number(r.cost).toFixed(4)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="p-8 text-center text-muted">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
