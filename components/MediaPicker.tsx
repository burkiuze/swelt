"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clapperboard, ImageIcon, Search, Sparkles } from "lucide-react";
import { MODELS } from "@/lib/catalog";
import { useFalModels } from "./falModels";
import Link from "next/link";
import { Lock } from "lucide-react";
import { LAB_LOGOS } from "@/lib/labs";
import { modelAllowed } from "@/lib/plans";
import { usePlan } from "./usePlan";

/** Pick the media model the agent must use: "auto" or a model id, limited to `kind` when given. */
export function MediaPicker({
  value,
  onChange,
  kind,
  align = "right",
}: {
  value: string;
  onChange: (id: string) => void;
  kind?: "image" | "video";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const plan = usePlan();
  const fal = useFalModels();
  type Pickable = { id: string; name: string; lab: string; kind: "image" | "video"; category: string; priceLabel: string; provider?: string };
  const list = useMemo<Pickable[]>(() => [...MODELS, ...fal].filter((m) => !kind || m.kind === kind), [kind, fal]);
  const allowed = (m: Pickable) => plan === null || modelAllowed(plan, m);
  // Switching tabs (image ↔ video) resets a choice that no longer fits.
  useEffect(() => {
    if (value.startsWith("fal/") && !fal.length) return; // fal list still loading
    if (value !== "auto" && !list.some((m) => m.id === value && (plan === null || modelAllowed(plan, m)))) onChange("auto");
  }, [list, value, onChange, plan, fal.length]);

  const s = q.trim().toLowerCase();
  const shown = list.filter((m) => !s || `${m.name} ${m.lab} ${m.category}`.toLowerCase().includes(s));
  const current = list.find((m) => m.id === value);
  const own = shown.filter((m) => m.provider !== "fal");
  const falShown = shown.filter((m) => m.provider === "fal");
  const groups: { title: string; items: typeof shown }[] = [
    { title: "Image", items: own.filter((m) => m.kind === "image") },
    { title: "Video", items: own.filter((m) => m.kind === "video") },
    { title: "fal · Image (Ultra)", items: falShown.filter((m) => m.kind === "image") },
    { title: "fal · Video (Ultra)", items: falShown.filter((m) => m.kind === "video") },
  ].filter((g) => g.items.length);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex max-w-[190px] items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition ${open ? "bg-panel-2" : "hover:bg-panel-2"}`}
        title="Media model"
      >
        {current ? (
          <Logo lab={current.lab} />
        ) : kind === "video" ? (
          <Clapperboard size={14} strokeWidth={1.8} className="text-muted" />
        ) : (
          <ImageIcon size={14} strokeWidth={1.8} className="text-muted" />
        )}
        <span className="truncate font-semibold">{current ? current.name : "Auto"}</span>
        {!current && <span className="text-muted">{kind ? `${kind} model` : "media"}</span>}
        <ChevronDown size={14} className={`shrink-0 text-dim transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute bottom-full z-50 mb-2 w-80 overflow-hidden rounded-lg border border-line-2 bg-[#202020] text-left text-sm shadow-xl shadow-black/40 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kind ?? "media"} models`} className="input h-8 pl-7" />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange("auto");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-[#2a2a2a]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-panel-2">
                <Sparkles size={13} />
              </span>
              <span className="flex-1">
                <span className="block font-medium">Auto</span>
                <span className="block text-xs text-dim">The agent picks the best {kind ?? "media"} model</span>
              </span>
              <Check size={15} className={value === "auto" ? "text-white" : "invisible"} />
            </button>
            {groups.map((g) => (
              <div key={g.title}>
                {(!kind || g.title.startsWith("fal")) && <div className="px-2.5 pb-1 pt-2 text-xs font-medium text-dim">{g.title}</div>}
                {g.items.map((m) =>
                  !allowed(m) ? (
                    <Link
                      key={m.id}
                      href="/pricing"
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left opacity-55 hover:bg-[#2a2a2a] hover:opacity-100"
                      title="Included in Pro and Ultra"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-panel-2">
                        <Logo lab={m.lab} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.name}</span>
                        <span className="block truncate text-xs text-dim">{m.lab}</span>
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${m.provider === "fal" ? "bg-[#f59e0b]/15 text-[#fbbf24]" : "bg-[#3b82f6]/15 text-[#7dd3fc]"}`}
                      >
                        <Lock size={10} /> {m.provider === "fal" ? "Ultra" : "Pro"}
                      </span>
                    </Link>
                  ) : (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left hover:bg-[#2a2a2a]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-panel-2">
                      <Logo lab={m.lab} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-dim">
                        {m.lab} · {m.priceLabel}
                      </span>
                    </span>
                    <Check size={15} className={value === m.id ? "text-white" : "invisible"} />
                  </button>
                  ),
                )}
              </div>
            ))}
            {!groups.length && <div className="p-4 text-center text-xs text-dim">No models match.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Logo({ lab }: { lab: string }) {
  const src = LAB_LOGOS[lab];
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" /> : <span className="text-[10px] font-bold uppercase">{lab[0]}</span>;
}
