"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { LABS, MODELS, type Model } from "@/lib/catalog";
import { ModelCard, type Preview } from "./ModelCard";

const TABS = [
  { key: "all", label: "All" },
  { key: "image", label: "Image" },
  { key: "video", label: "Video" },
  { key: "text-to-image", label: "Text → Image" },
  { key: "image-to-image", label: "Image editing" },
  { key: "text-to-video", label: "Text → Video" },
  { key: "image-to-video", label: "Image → Video" },
];

function Section({ title, subtitle, models, previews }: { title: string; subtitle?: string; models: Model[]; previews: Record<string, Preview> }) {
  if (!models.length) return null;
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
        {title} <ChevronRight size={22} className="text-muted" />
      </h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} preview={previews[m.id]} />
        ))}
      </div>
    </section>
  );
}

export function Explore({ previews = {} }: { previews?: Record<string, Preview> }) {
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

  const labs = (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Model Labs</h2>
      <p className="mt-1 text-sm text-muted">Explore the AI labs powering models on Swelt</p>
      <div className="scrollbar-none mt-6 flex gap-3 overflow-x-auto">
        {LABS.map((l) => (
          <button
            key={l}
            onClick={() => {
              setLab(lab === l ? null : l);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex h-28 w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border bg-panel text-sm transition hover:border-line-2 ${lab === l ? "border-[#8a8a8a]" : "border-line"}`}
          >
            <span className="font-semibold">{l}</span>
            <span className="text-xs text-dim">{MODELS.filter((m) => m.lab === l).length} models</span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={15} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models" className="input h-8 pl-8" />
        </div>
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-8 shrink-0 rounded-md px-2.5 text-[13px] font-medium transition ${tab === t.key ? "bg-panel-2 text-white" : "text-muted hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {lab && (
          <button onClick={() => setLab(null)} className="h-9 rounded-md bg-panel-2 px-3 text-sm">
            {lab} ✕
          </button>
        )}
      </div>

      {browsing ? (
        <>
          <Section title="Recently Added" subtitle="Newly added models across image and video." previews={previews} models={MODELS.filter((m) => m.isNew)} />
          <Section title="Video" subtitle="Text-to-video, image-to-video and video editing." previews={previews} models={MODELS.filter((m) => m.kind === "video" && !m.isNew)} />
          <Section title="Image editing" subtitle="Edit images with reference photos and instructions." previews={previews} models={MODELS.filter((m) => m.category === "image-to-image" && !m.isNew)} />
          <Section title="Text to image" subtitle="Fast drafts to premium renders." previews={previews} models={MODELS.filter((m) => m.category === "text-to-image" && !m.isNew)} />
          {labs}
        </>
      ) : filtered.length ? (
        <Section previews={previews} title={`${filtered.length} model${filtered.length === 1 ? "" : "s"}`} models={filtered} />
      ) : (
        <div className="card p-10 text-center text-muted">No models match your search.</div>
      )}
    </div>
  );
}
