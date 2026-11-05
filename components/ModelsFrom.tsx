"use client";

import { useEffect, useState } from "react";

// Providers that actually serve Vlipa's models.
const PROVIDERS: { name: string; logo: string | null; what: string }[] = [
  { name: "RunPod", logo: "/brand/runpod-white.png", what: "image & video models" },
  { name: "OpenRouter", logo: "/brand/openrouter-white.png", what: "agent LLMs" },
  { name: "Higgsfield", logo: "/brand/higgsfield-white.png", what: "Kling 4.0, Genjutsu, Marketing Studio" },
  { name: "fal", logo: "/brand/fal-white.png", what: "1,000+ image & video models" },
];

/** "Models from <provider>" — the provider rotates, one at a time. */
export function ModelsFrom() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % PROVIDERS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 text-sm text-muted">
      <span>Models from</span>
      <span className="relative h-8 w-44 overflow-hidden">
        {PROVIDERS.map((p, k) => (
          <span
            key={p.name}
            className="absolute inset-0 flex items-center gap-2 transition-all duration-500 ease-out"
            style={{ transform: `translateY(${k === i ? 0 : k === (i + PROVIDERS.length - 1) % PROVIDERS.length ? -100 : 100}%)`, opacity: k === i ? 1 : 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.logo && <img src={p.logo} alt="" className="h-5 w-auto" />}
            <span className="font-semibold text-white">{p.name}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
