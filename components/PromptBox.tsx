"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ArrowUp, Clapperboard, Hand, ImageIcon, Mic, Plus, Shuffle, Sparkles } from "lucide-react";
import type { Effort, LlmKey } from "@/lib/llm";
import { MediaPicker } from "./MediaPicker";
import { ModelPicker } from "./ModelPicker";

export type AgentPrefs = { llm: LlmKey; effort: Effort; approval: boolean; media: string };

export function AgentControls({ prefs, onChange, kind }: { prefs: AgentPrefs; onChange: (p: AgentPrefs) => void; kind?: "image" | "video" }) {
  const latest = useRef(prefs);
  latest.current = prefs;
  const setLlm = useCallback((v: { llm: LlmKey; effort: Effort }) => onChange({ ...latest.current, ...v }), [onChange]);
  // Image / Video tabs run the media model directly: no text model, no approval step.
  if (kind) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="flex-1" />
        <MediaPicker kind={kind} value={prefs.media} onChange={(media) => onChange({ ...prefs, media })} />
      </div>
    );
  }
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
      <ModelPicker llm={prefs.llm} effort={prefs.effort} onChange={setLlm} />
      <MediaPicker kind={kind} value={prefs.media} onChange={(media) => onChange({ ...prefs, media })} />
    </div>
  );
}

type Mode = "agent" | "image" | "video";

const MODES: { key: Mode; label: string; icon: typeof Sparkles; badge?: string; placeholder: string; prefix: string }[] = [
  { key: "agent", label: "Agent", icon: Sparkles, placeholder: "Tell the agent what you want to make — it plans the steps and picks the models.", prefix: "" },
  { key: "image", label: "Image", icon: ImageIcon, placeholder: "Describe the image: subject, style, light, framing…", prefix: "" },
  { key: "video", label: "Video", icon: Clapperboard, badge: "New", placeholder: "Describe the shot: what moves, camera, mood, length…", prefix: "" },
];

const IDEAS: Record<Mode, { label: string; q: string; dot: string }[]> = {
  agent: [
    { label: "Launch kit for a new coffee brand", q: "Design a logo concept, a product photo and a 5s promo clip for a new specialty coffee brand called Ember.", dot: "from-amber-300 to-rose-400" },
    { label: "Storyboard a 3-shot sci-fi teaser", q: "Storyboard a 3-shot sci-fi teaser: render each frame as an image, then animate the best one.", dot: "from-sky-300 to-indigo-500" },
    { label: "Turn my selfie into a cartoon avatar", q: "Turn my attached photo into a friendly cartoon avatar in 3 different styles.", dot: "from-emerald-300 to-teal-500" },
    { label: "Ad set for a running shoe", q: "Create 3 ad images for a neon running shoe (studio, street, trail), then a short video of the best one.", dot: "from-fuchsia-300 to-violet-500" },
    { label: "Album cover + looping visualizer", q: "Make a dreamy synthwave album cover, then a seamless 5s looping video from it.", dot: "from-pink-300 to-orange-400" },
  ],
  image: [
    { label: "Knitted toy duck, studio shot", q: "A knitted yellow toy duck on a pastel backdrop, soft studio light, product photo.", dot: "from-yellow-200 to-amber-400" },
    { label: "Mountain travel poster", q: "Minimal travel poster of a snowy mountain at sunrise, flat colors, bold title space.", dot: "from-sky-200 to-blue-500" },
    { label: "Cozy reading nook interior", q: "Cozy reading nook by a rainy window, warm lamp light, film photo look.", dot: "from-orange-200 to-red-400" },
    { label: "Isometric game island", q: "Isometric low-poly floating island with a tiny village and waterfalls, game asset.", dot: "from-lime-200 to-emerald-500" },
  ],
  video: [
    { label: "Drone shot over a neon city", q: "Slow drone push over a rainy neon city at night, reflections on the streets, 5 seconds.", dot: "from-cyan-300 to-blue-600" },
    { label: "Cat chasing a paper boat", q: "A kitten chasing a paper boat across a puddle, low angle, playful, 5 seconds.", dot: "from-amber-200 to-pink-400" },
    { label: "Product spin on black", q: "A glossy perfume bottle slowly rotating on black, rim light, luxury ad, 5 seconds.", dot: "from-violet-300 to-fuchsia-500" },
    { label: "Waves at golden hour", q: "Waves rolling onto a beach at golden hour, gentle handheld camera, 5 seconds.", dot: "from-orange-200 to-sky-400" },
  ],
};

function pick<T>(list: T[], n: number) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

export function PromptBox() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("agent");
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState<AgentPrefs>({ llm: "glm", effort: "medium", approval: true, media: "auto" });
  const [ideas, setIdeas] = useState(() => IDEAS.agent.slice(0, 3));
  const current = MODES.find((m) => m.key === mode)!;

  const go = (q = text) => {
    if (!q.trim()) return;
    const p = new URLSearchParams({ q: current.prefix + q, llm: prefs.llm, effort: prefs.effort, approval: prefs.approval ? "1" : "0" });
    if (prefs.media !== "auto") p.set("media", prefs.media);
    if (mode !== "agent") p.set("kind", mode);
    router.push(`/agent?${p}`);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setIdeas(IDEAS[m].slice(0, 3));
  };

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="flex gap-1 pl-3">
        {MODES.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchMode(key)}
            className={`flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3.5 py-2 text-[13px] font-medium transition ${
              mode === key ? "border-line-2 bg-[#1e1e1e] text-white" : "border-transparent text-muted hover:text-white"
            }`}
          >
            <Icon size={14} strokeWidth={1.8} /> {label}
            {badge && <span className="rounded bg-[#e5484d] px-1 text-[10px] font-semibold uppercase leading-4 text-white">{badge}</span>}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-line-2 bg-[#1e1e1e] shadow-2xl shadow-black/40">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              go();
            }
          }}
          rows={3}
          placeholder={current.placeholder}
          className="block w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed outline-none placeholder:text-dim"
        />
        <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
          <Plus size={16} className="mx-1 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <AgentControls prefs={prefs} onChange={setPrefs} kind={mode === "agent" ? undefined : mode} />
          </div>
          <Mic size={16} className="shrink-0 text-muted" />
          <button
            onClick={() => go()}
            disabled={!text.trim()}
            className="flex h-9 w-11 shrink-0 items-center justify-center rounded-full bg-[#ededed] text-black transition hover:bg-white disabled:bg-[#2c2c2c] disabled:text-dim"
            aria-label="Send"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-muted">
        Need a spark? Pick one to start
        <button
          type="button"
          onClick={() => setIdeas(pick(IDEAS[mode], 3))}
          className="rounded p-1 transition hover:bg-panel-2 hover:text-white"
          aria-label="Shuffle ideas"
          title="Shuffle"
        >
          <Shuffle size={14} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {ideas.map((i) => (
          <button
            key={i.label}
            onClick={() => go(i.q)}
            className="flex items-center gap-2 rounded-full border border-line-2 bg-panel/70 py-1.5 pl-1.5 pr-3.5 text-[13px] backdrop-blur transition hover:border-[#4a4a4a] hover:bg-panel-2"
          >
            <span className={`h-5 w-5 shrink-0 rounded-full bg-gradient-to-br ${i.dot}`} />
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
