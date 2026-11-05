"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { LABS, MODELS, type Model } from "@/lib/catalog";
import { ModelCard } from "./ModelCard";

const TABS = [
  { key: "all", label: "All" },
  { key: "image", label: "Image" },
  { key: "video", label: "Video" },
  { key: "text-to-image", label: "Text → Image" },
  { key: "image-to-image", label: "Image editing" },
  { key: "text-to-video", label: "Text → Video" },
  { key: "image-to-video", label: "Image → Video" },
];

function Section({ title, subtitle, models }: { title: string; subtitle?: string; models: Model[] }) {
  if (!models.length) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title} <ChevronRight size={26} className="text-muted" />
      </h2>
      {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>
    </section>
  );
}

export function Explore() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [lab, setLab] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("focus")) searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MODELS.filter(
      (m) =>
        (tab === "all" || m.kind === tab || m.category === tab) &&
        (!lab || m.lab === lab) &&
        (!s || `${m.id} ${m.name} ${m.description} ${m.tags.join(" ")} ${m.category}`.toLowerCase().includes(s)),
    );
  }, [q, tab, lab]);

  const browsing = !q && tab === "all" && !lab;

  return (
    <div className="space-y-16">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={18} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models, e.g. “image editing”, “video with audio”…" className="input h-12 pl-10 text-base" />
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`btn shrink-0 ${tab === t.key ? "border-[#ededed] bg-[#ededed] text-black hover:bg-[#d4d4d4]" : "text-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Model Labs</h2>
        <p className="text-sm text-muted">Explore the AI labs powering models on Swelt</p>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {LABS.map((l) => (
            <button key={l} onClick={() => setLab(lab === l ? null : l)} className={`card shrink-0 px-4 py-3 text-sm ${lab === l ? "border-[#6b6b6b] bg-panel-2" : ""}`}>
              <div className="font-semibold">{l}</div>
              <div className="text-xs text-dim">{MODELS.filter((m) => m.lab === l).length} models</div>
            </button>
          ))}
        </div>
      </section>

      {browsing ? (
        <>
          <Section title="Recently Added" subtitle="Newly added models across image and video." models={MODELS.filter((m) => m.isNew)} />
          <Section title="Video" subtitle="Text-to-video, image-to-video and video editing." models={MODELS.filter((m) => m.kind === "video" && !m.isNew)} />
          <Section title="Image editing" subtitle="Edit images with reference photos and instructions." models={MODELS.filter((m) => m.category === "image-to-image" && !m.isNew)} />
          <Section title="Text to image" subtitle="Fast drafts to premium renders." models={MODELS.filter((m) => m.category === "text-to-image" && !m.isNew)} />
        </>
      ) : filtered.length ? (
        <Section title={`${filtered.length} model${filtered.length === 1 ? "" : "s"}`} models={filtered} />
      ) : (
        <div className="card p-10 text-center text-muted">No models match your search.</div>
      )}
    </div>
  );
}
