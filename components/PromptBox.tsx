"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Brain, Hand, ImageIcon, Plus } from "lucide-react";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";

export type AgentPrefs = { llm: LlmKey; effort: Effort; approval: boolean };

export function AgentControls({ prefs, onChange }: { prefs: AgentPrefs; onChange: (p: AgentPrefs) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => onChange({ ...prefs, approval: !prefs.approval })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${prefs.approval ? "bg-panel-2 text-white" : "text-muted hover:text-white"}`}
        title="When on, the agent proposes model runs and waits for your approval"
      >
        <Hand size={15} /> {prefs.approval ? "Ask for approval" : "Auto-run"}
      </button>
      <span className="flex-1" />
      <label className="flex items-center gap-1.5 text-muted">
        <Brain size={15} />
        <select
          value={prefs.llm}
          onChange={(e) => onChange({ ...prefs, llm: e.target.value as LlmKey })}
          className="cursor-pointer bg-transparent font-medium text-white outline-none"
        >
          {LLMS.map((l) => (
            <option key={l.key} value={l.key} className="bg-panel">
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={prefs.effort}
          onChange={(e) => onChange({ ...prefs, effort: e.target.value as Effort })}
          className="cursor-pointer bg-transparent capitalize outline-none"
        >
          {EFFORTS.map((e) => (
            <option key={e} value={e} className="bg-panel capitalize">
              {e}
            </option>
          ))}
        </select>
      </label>
      <span className="flex items-center gap-1.5 text-muted">
        <ImageIcon size={15} /> <span className="font-medium text-white">Media</span> RunPod
      </span>
    </div>
  );
}

export function PromptBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState<AgentPrefs>({ llm: "opus", effort: "medium", approval: false });

  const go = (q = text) => {
    if (!q.trim()) return;
    const p = new URLSearchParams({ q, llm: prefs.llm, effort: prefs.effort, approval: prefs.approval ? "1" : "0" });
    router.push(`/agent?${p}`);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={2}
            placeholder="Describe what you want to generate…"
            className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-dim"
          />
          <button onClick={() => go()} disabled={!text.trim()} className="btn btn-primary h-10 w-10 justify-center p-0" aria-label="Send">
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          <Plus size={16} className="text-dim" />
          <div className="flex-1">
            <AgentControls prefs={prefs} onChange={setPrefs} />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ["Create different game environments from one concept", "Create 3 different game environment concepts (forest, snowy mountains, desert ruins) for the same stylized fantasy world, then animate the best one."],
          ["Create a polished campaign image for a perfume", "Create a polished, premium campaign image for a minimalist perfume bottle on golden silk, soft studio light."],
          ["Product shots from different camera angles", "Create product images of a glass water bottle from 3 different camera angles on a clean studio background."],
        ].map(([label, q]) => (
          <button key={label} onClick={() => go(q)} className="card p-3 text-left text-sm font-medium hover:border-zinc-600">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
