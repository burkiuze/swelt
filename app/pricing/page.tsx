import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import { getModel, MODELS } from "@/lib/catalog";
import { modelAllowed } from "@/lib/plans";
import { LLMS } from "@/lib/llm";
import { PLAN_DAYS, PLANS } from "@/lib/plans";

export const metadata = { title: "Pricing — Vlipa" };

const STORE = process.env.NEXT_PUBLIC_STORE_URL || "";

const IMG = getModel("qwen/qwen-image-3")!;
const VID = getModel("x-ai/grok-imagine-video-1.5-lite")!;
const VID_SECONDS = 5;
const runs = (credits: number, price: number) => Math.floor(credits / price).toLocaleString("en-US");

const THEME: Record<string, { card: string; text: string; accent: string; button: string }> = {
  premium: { card: "bg-gradient-to-b from-[#2a2a2a] to-[#1c1c1c]", text: "text-white", accent: "text-white", button: "bg-white text-black hover:bg-zinc-200" },
  pro: { card: "bg-[radial-gradient(120%_120%_at_0%_0%,#7dd3fc_0%,#3b82f6_45%,#1e3a8a_100%)] shadow-[0_20px_60px_-20px_#3b82f6]", text: "text-white", accent: "text-[#7dd3fc]", button: "bg-white text-black hover:bg-zinc-100" },
  ultra: { card: "bg-[radial-gradient(120%_120%_at_0%_0%,#fde68a_0%,#f59e0b_40%,#c2410c_100%)] shadow-[0_20px_60px_-20px_#f59e0b]", text: "text-white", accent: "text-[#fbbf24]", button: "bg-white text-black hover:bg-zinc-100" },
};

const FAQ = [
  { q: "How do I get a plan?", a: "Buy a Vlipa code for the plan you want from our official store, then open Account → Credits and redeem it. Credits are added instantly and the plan turns on right away." },
  {
    q: "What are credits?",
    a: `Credits are a dollar balance. Every image or video is charged at the price shown on the model, so $1 of credits covers about ${Math.floor(1 / IMG.price)} ${IMG.name} images or ${Math.floor(1 / ((VID.perSecond ?? VID.price) * VID_SECONDS))} ${VID_SECONDS}-second ${VID.name} clips.`,
  },
  { q: "Do unused credits expire?", a: `No. Credits stay on your account. The plan itself (and its agent models) is active for ${PLAN_DAYS} days after you redeem the code.` },
  { q: "Which agent models come with each plan?", a: "Every plan includes GLM 5.3 Flash and DeepSeek V4.1 Flash. Ultra adds Opus 5.5 and GPT-6.1 Sol, our strongest planners." },
  { q: "What do I get with fal models?", a: "Ultra unlocks every image and video model on fal — over a thousand, from FLUX and Recraft to Kling, Veo and Wan. They are charged per image or per second at the price shown on each model." },
  { q: "Which media models come with Premium?", a: "Premium includes every OpenRouter image and video model (Qwen, FLUX 3, Seedream 5.0, Grok Imagine, HeyGen and more). Pro and Ultra add Kling 4.0, Genjutsu Light, Marketing Studio and the rest of the catalog." },
  { q: "Is there an unlimited plan?", a: "No. Every generation uses credits, so you always see exactly what a run costs before it starts." },
  { q: "Can I buy more credits or upgrade later?", a: "Yes. Redeem another code at any time. Credits stack, and the higher plan wins while it is active." },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Plans</h1>
          <p className="mt-2 text-muted">Pick a credit pack. No subscriptions, no surprises.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e5484d]/40 bg-[#e5484d]/10 px-3 py-1.5 text-sm font-medium text-[#ff9592]">
          <Sparkles size={14} /> Launch offer · 50% off every plan
        </span>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const t = THEME[p.key];
          const href = STORE || "/account#billing";
          return (
            <div key={p.key} className="flex flex-col">
              <div className={`relative overflow-hidden rounded-3xl p-6 ${t.card}`}>
                <div className="flex items-center gap-2">
                  <h2 className={`text-4xl font-bold tracking-tight ${t.text}`}>{p.name}</h2>
                  {p.badge && <span className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{p.badge}</span>}
                </div>
                <p className="mt-1 text-sm text-white/75">{p.blurb}</p>
                <div className="mt-6 flex items-baseline gap-3">
                  <span className="text-2xl font-semibold text-white/50 line-through decoration-2">${p.was}</span>
                  <span className={`text-5xl font-bold tracking-tight ${t.text}`}>${p.price}</span>
                  <span className="text-sm text-white/70">one-time</span>
                </div>
                <a
                  href={href}
                  target={STORE ? "_blank" : undefined}
                  rel={STORE ? "noreferrer" : undefined}
                  className={`mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition ${t.button}`}
                >
                  Get {p.name}
                  <span className="rounded-full bg-[#e5484d] px-2 py-0.5 text-xs font-bold text-white">−50%</span>
                </a>
              </div>

              <div className="space-y-5 px-2 pt-6 text-[15px]">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white/10 ${t.accent}`}>
                      <Sparkles size={11} />
                    </span>
                    <span className={t.accent}>${p.credits} in credits</span>
                    {p.bonus ? <span className="rounded-full bg-[#4ade80]/15 px-2 py-0.5 text-xs font-semibold text-[#4ade80]">+${p.bonus} bonus</span> : null}
                  </div>
                  <div className="ml-2.5 mt-2 space-y-2 border-l border-line-2 pl-5 text-sm">
                    <div>
                      <span className="font-medium">≈ {runs(p.credits, IMG.price)} images</span> <span className="text-muted">{IMG.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">≈ {runs(p.credits, (VID.perSecond ?? VID.price) * VID_SECONDS)} videos</span>{" "}
                      <span className="text-muted">
                        {VID.name} · {VID_SECONDS}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-line pt-5">
                  <div className="mb-3 text-sm text-dim">Agent models · {PLAN_DAYS} days</div>
                  <ul className="space-y-2.5">
                    {LLMS.map((l) => {
                      const ok = !l.ultra || p.ultraLlms;
                      return (
                        <li key={l.key} className={`flex items-center gap-2.5 ${ok ? "" : "text-dim"}`}>
                          {ok ? <Check size={16} className="text-[#4ade80]" /> : <Minus size={16} />}
                          {l.label}
                          {l.ultra && <span className="rounded bg-[#f59e0b]/15 px-1.5 text-[11px] font-medium text-[#fbbf24]">Ultra</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="border-t border-line pt-5">
                  <div className="mb-3 text-sm text-dim">Included</div>
                  <ul className="space-y-2.5">
                    {[
                      p.allModels
                        ? `All ${MODELS.length} image & video models`
                        : `${MODELS.filter((m) => modelAllowed(p.key, m)).length} OpenRouter image & video models`,
                      ...(p.allModels ? ["Kling 4.0, Genjutsu Light & Marketing Studio"] : []),
                      ...(p.key === "ultra" ? ["Every fal image & video model (1,000+)"] : []),
                      "Choose the exact media model for the agent",
                      "Credits never expire",
                      "Full-quality downloads, no watermark",
                      ...(p.key === "ultra" ? ["Priority support"] : []),
                    ].map((x) => (
                      <li key={x} className="flex items-center gap-2.5">
                        <Check size={16} className="text-[#4ade80]" /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-20">
        <h2 className="text-3xl font-semibold tracking-tight">Compare plans</h2>
        <p className="mt-1 text-muted">How far each pack goes with popular models.</p>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="p-4 font-medium text-muted">Model</th>
                {PLANS.map((p) => (
                  <th key={p.key} className="p-4 text-base font-semibold">
                    {p.name}
                    <div className="text-xs font-normal text-dim">${p.price} one-time</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "qwen/qwen-image-3",
                "black-forest-labs/flux-3-image-klein",
                "bytedance-seed/seedream-5.0-pro",
                "black-forest-labs/flux-3-image",
                "x-ai/grok-imagine-video-1.5-lite",
                "heygen/heygen-video",
                "kwaivgi/kling-4.0",
              ]
                .map((id) => getModel(id))
                .filter((m): m is NonNullable<typeof m> => Boolean(m))
                .map((m) => {
                  const cost = m.perSecond ? m.perSecond * VID_SECONDS : m.price;
                  return (
                    <tr key={m.id} className="border-b border-line last:border-0">
                      <td className="p-4">
                        <Link href={`/models/${m.id}`} className="font-medium hover:underline">
                          {m.name}
                        </Link>
                        <div className="text-xs text-dim">
                          ~${cost.toFixed(3)} per {m.kind === "video" ? `${VID_SECONDS}s video` : "image"}
                        </div>
                      </td>
                      {PLANS.map((p) => (
                        <td key={p.key} className="p-4">
                          {modelAllowed(p.key, m) ? (
                            `${runs(p.credits, cost)} ${m.kind === "video" ? "videos" : "images"}`
                          ) : (
                            <span className="flex items-center gap-1.5 text-dim">
                              <Minus size={16} /> Pro & Ultra
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              <tr>
                <td className="p-4 font-medium">Opus 5.5 & GPT-6.1 Sol agent</td>
                {PLANS.map((p) => (
                  <td key={p.key} className="p-4">
                    {p.ultraLlms ? <Check size={16} className="text-[#4ade80]" /> : <Minus size={16} className="text-dim" />}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                {f.q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className="text-muted">Have a code already?</span>
          <Link href="/account#billing" className="btn btn-primary">
            Redeem it
          </Link>
        </div>
      </section>
    </div>
  );
}
