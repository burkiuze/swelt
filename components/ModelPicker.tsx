"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Check, ChevronDown } from "lucide-react";
import { EFFORTS, LLMS, type Effort, type LlmKey } from "@/lib/llm";

const EFFORT_HINT: Record<Effort, string> = {
  low: "Fastest replies",
  medium: "Balanced",
  high: "Most careful planning",
};

/** fal-style popover for choosing the agent LLM and reasoning effort. */
export function ModelPicker({
  llm,
  effort,
  onChange,
  align = "right",
}: {
  llm: LlmKey;
  effort: Effort;
  onChange: (v: { llm: LlmKey; effort: Effort }) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LLMS.find((l) => l.key === llm) ?? LLMS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition ${open ? "bg-panel-2" : "hover:bg-panel-2"}`}
      >
        <BrainCircuit size={14} strokeWidth={1.8} className="text-muted" />
        <span className="font-semibold">{current.label}</span>
        <span className="capitalize text-muted">{effort}</span>
        <ChevronDown size={14} className={`text-dim transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute bottom-full z-50 mb-2 w-64 overflow-hidden rounded-lg border border-line-2 bg-[#202020] p-1 text-sm shadow-xl shadow-black/40 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2.5 pb-1 pt-2 text-xs font-medium text-dim">Model</div>
          {LLMS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => onChange({ llm: l.key, effort })}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-[#2a2a2a]"
            >
              <span className="flex-1">
                <span className="block font-medium">{l.label}</span>
                <span className="block text-xs text-dim">{l.vendor}</span>
              </span>
              {l.default && <span className="rounded bg-[#d9f99d]/15 px-1.5 py-0.5 text-[11px] font-medium text-[#d9f99d]">Default</span>}
              <Check size={15} className={l.key === llm ? "text-white" : "invisible"} />
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <div className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-dim">Reasoning effort</div>
          {EFFORTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange({ llm, effort: e });
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-[#2a2a2a]"
            >
              <span className="flex-1">
                <span className="capitalize">{e}</span>
                <span className="ml-2 text-xs text-dim">{EFFORT_HINT[e]}</span>
              </span>
              <Check size={15} className={e === effort ? "text-white" : "invisible"} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
