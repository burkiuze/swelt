"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Hand, ImageIcon, Plus, TextQuote } from "lucide-react";
import type { Effort, LlmKey } from "@/lib/llm";
import { ModelPicker } from "./ModelPicker";

export type AgentPrefs = { llm: LlmKey; effort: Effort; approval: boolean };

export function AgentControls({ prefs, onChange }: { prefs: AgentPrefs; onChange: (p: AgentPrefs) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <button
        type="button"
        onClick={() => onChange({ ...prefs, approval: !prefs.approval })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-panel-2 ${prefs.approval ? "text-white" : "text-muted"}`}
        title="When on, the agent proposes model runs and waits for your approval"
      >
        <Hand size={15} strokeWidth={1.8} /> {prefs.approval ? "Ask for approval" : "Auto-run"}
      </button>
      <span className="flex-1" />
      <ModelPicker llm={prefs.llm} effort={prefs.effort} onChange={(v) => onChange({ ...prefs, ...v })} />
      <span className="hidden items-center gap-1.5 px-2 text-muted sm:flex">
        <ImageIcon size={15} strokeWidth={1.8} /> <span className="font-semibold text-white">Media</span> RunPod
      </span>
    </div>
  );
}

const IDEAS = [
  { label: "Create different game environments from one concept", q: "Create 3 different game environment concepts (forest, snowy mountains, desert ruins) for the same stylized fantasy world, then animate the best one.", g: ["#7c9a5b", "#cbd5e1", "#3f3f46"] },
  { label: "Create a polished campaign image for a perfume", q: "Create a polished, premium campaign image for a minimalist perfume bottle on golden silk, soft studio light.", g: ["#d4a256", "#7c5320", "#1c1917"] },
  { label: "Create product images from different camera angles", q: "Create product images of a glass water bottle from 3 different camera angles on a clean studio background.", g: ["#94a3b8", "#334155", "#0f172a"] },
];

export function PromptBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState<AgentPrefs>({ llm: "opus", effort: "medium", approval: true });

  const go = (q = text) => {
    if (!q.trim()) return;
    const p = new URLSearchParams({ q, llm: prefs.llm, effort: prefs.effort, approval: prefs.approval ? "1" : "0" });
    router.push(`/agent?${p}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1300px]">
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center gap-3 p-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#141414] text-muted">
            <TextQuote size={20} strokeWidth={1.8} />
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={1}
            placeholder="Describe what you want to generate…"
            className="flex-1 resize-none bg-transparent py-3 text-lg outline-none placeholder:text-dim"
          />
          <button onClick={() => go()} disabled={!text.trim()} className="flex h-12 w-12 items-center justify-center rounded-md bg-[#2a2a2a] text-white transition hover:bg-[#333] disabled:text-dim" aria-label="Send">
            <ArrowUp size={20} />
          </button>
        </div>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5">
          <Plus size={18} className="text-dim" />
          <div className="flex-1">
            <AgentControls prefs={prefs} onChange={setPrefs} />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {IDEAS.map((i) => (
          <button key={i.label} onClick={() => go(i.q)} className="card flex items-center gap-4 overflow-hidden text-left transition hover:border-line-2">
            <span
              className="grain h-20 w-24 shrink-0"
              style={{ background: `radial-gradient(60% 70% at 30% 30%, ${i.g[0]} 0%, transparent 70%), radial-gradient(60% 70% at 80% 80%, ${i.g[1]} 0%, transparent 70%), ${i.g[2]}` }}
            />
            <span className="pr-4 text-[17px] font-semibold leading-snug">{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
