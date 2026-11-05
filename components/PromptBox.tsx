"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Hand, ImageIcon, Mic, Plus, TextQuote } from "lucide-react";
import type { Effort, LlmKey } from "@/lib/llm";
import { ModelPicker } from "./ModelPicker";

export type AgentPrefs = { llm: LlmKey; effort: Effort; approval: boolean };

export function AgentControls({ prefs, onChange }: { prefs: AgentPrefs; onChange: (p: AgentPrefs) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
      <button
        type="button"
        onClick={() => onChange({ ...prefs, approval: !prefs.approval })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-panel-2 ${prefs.approval ? "text-white" : "text-muted"}`}
        title="When on, the agent proposes model runs and waits for your approval"
      >
        <Hand size={14} strokeWidth={1.8} /> {prefs.approval ? "Ask for approval" : "Auto-run"}
      </button>
      <span className="flex-1" />
      <ModelPicker llm={prefs.llm} effort={prefs.effort} onChange={(v) => onChange({ ...prefs, ...v })} />
      <span className="hidden items-center gap-1.5 px-2 text-muted sm:flex">
        <ImageIcon size={14} strokeWidth={1.8} /> <span className="font-semibold text-white">Media</span> RunPod
      </span>
    </div>
  );
}

const IDEAS = [
  { label: "Turn a sketch idea into a cute 3D character", q: "Create a cute crocheted toy character of a yellow duck, studio photo, then make 3 color variations.", img: "/previews/flux-1-dev.webp" },
  { label: "Create different game environments from one concept", q: "Create 3 different game environment concepts (underwater reef, snowy mountains, desert ruins) for the same stylized fantasy world, then animate the best one.", img: "/previews/flux-1-schnell.webp" },
  { label: "Upload a photo to create a stylized portrait", q: "Turn my attached photo into a warm, film-look portrait with soft window light.", img: "/previews/qwen-image-lora.webp" },
  { label: "Create a travel poster from a landscape", q: "Create a minimalist travel poster of a Himalayan peak at sunrise with prayer flags.", img: "/previews/z-image-turbo.webp" },
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
    <div className="mx-auto w-full max-w-[820px]">
      <div className="rounded-lg border border-line-2 bg-[#252525] shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 p-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] text-muted">
            <TextQuote size={16} strokeWidth={1.8} />
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
            className="flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-dim"
          />
          <Mic size={16} className="shrink-0 text-muted" />
          <button onClick={() => go()} disabled={!text.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#333] text-white transition hover:bg-[#3d3d3d] disabled:text-dim" aria-label="Send">
            <ArrowUp size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-2.5 py-1">
          <Plus size={15} className="text-dim" />
          <div className="flex-1">
            <AgentControls prefs={prefs} onChange={setPrefs} />
          </div>
        </div>
      </div>
      <div className="scrollbar-none mt-3 flex gap-3 overflow-x-auto">
        {IDEAS.map((i) => (
          <button key={i.label} onClick={() => go(i.q)} className="flex h-14 w-[250px] shrink-0 items-center gap-2.5 overflow-hidden rounded-md bg-[#232323] text-left transition hover:bg-[#2a2a2a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.img} alt="" className="h-full w-14 shrink-0 object-cover" />
            <span className="line-clamp-2 pr-3 text-[13px] font-semibold leading-snug">{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
