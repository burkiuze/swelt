"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Ticket } from "lucide-react";
import { creditsLabel } from "@/lib/credits";

export function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not redeem the code");
      const plan = data.plan ? `${String(data.plan)[0].toUpperCase()}${String(data.plan).slice(1)} plan activated. ` : "";
      setMsg({ ok: true, text: `${plan}${creditsLabel(Number(data.added))} added. New balance: ${creditsLabel(Number(data.credits))}` });
      setCode("");
      router.refresh();
      window.dispatchEvent(new Event("swelt:credits"));
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="redeem" className="text-sm font-medium">Redeem a code</label>
      <div className="mt-1.5 flex gap-2">
        <div className="relative flex-1">
          <Ticket size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
          <input
            id="redeem"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VLIPA-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="input h-8 pl-8 font-mono tracking-wide"
          />
        </div>
        <button className="btn btn-primary" disabled={busy || !code.trim()}>
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs ${msg.ok ? "text-[#4cc38a]" : "text-[#ff9592]"}`}>
          {msg.ok && <Check size={13} />} {msg.text}
        </p>
      )}
    </form>
  );
}
