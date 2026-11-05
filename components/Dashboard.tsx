"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, CircleDollarSign, FileText, ImageIcon, LayoutGrid, ReceiptText } from "lucide-react";
import { getModel } from "@/lib/catalog";
import { creditsLabel } from "@/lib/credits";
import { Media } from "./Media";
import { ModelRow } from "./ModelCard";

type Stats = {
  requests_7d: number;
  errors_7d: number;
  cost_7d: number;
  daily: { day: string; requests: number; errors: number }[];
  recent_models: string[];
  credits: number | null;
  unlimited: boolean;
};
type Item = { request_id: string; model_id: string; status: string; media: string[]; kind: string };

/** Dashed sparkline: a row of small segments, taller when there is activity. */
function Dashes({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const segs = values.flatMap((v) => [v, v, v]);
  return (
    <div className="flex h-20 flex-1 items-end gap-[3px] rounded-md bg-[#232323] p-2">
      {segs.map((v, i) => (
        <div key={i} className="flex-1 rounded-[1px]" style={{ height: v ? `${12 + (v / max) * 80}%` : "5px", background: color }} />
      ))}
    </div>
  );
}

export function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setS).catch(() => {});
    fetch("/api/generations?limit=12").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, []);

  const daily = s?.daily?.length ? s.daily : Array.from({ length: 7 }, () => ({ day: "", requests: 0, errors: 0 }));
  const recent = (s?.recent_models || []).map(getModel).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const money = (n: number | null | undefined) => creditsLabel(n);

  return (
    <div className="space-y-14">
      <section className="card grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="flex flex-col justify-between gap-6 p-5">
          <div className="flex gap-10">
            <div>
              <div className="text-sm text-muted">Balance</div>
              <div className="mt-1 text-2xl font-semibold">{s ? (s.unlimited ? "∞" : money(s.credits)) : "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Spent this week</div>
              <div className="mt-1 text-2xl font-semibold">{s ? money(s.cost_7d) : "—"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/usage" className="btn"><CircleDollarSign size={15} /> Credits</Link>
            <Link href="/usage" className="btn"><ReceiptText size={15} /> Usage</Link>
          </div>
        </div>
        <div className="flex gap-6 p-5">
          <div className="flex flex-col justify-between">
            <div>
              <div className="text-sm text-muted">Runs this week</div>
              <div className="mt-1 text-2xl font-semibold">{s?.requests_7d ?? "—"}</div>
            </div>
            <Link href="/usage" className="btn mt-6 self-start">View history</Link>
          </div>
          <Dashes values={daily.map((d) => d.requests)} color="#6d4aff" />
        </div>
        <div className="flex gap-6 p-5">
          <div className="flex flex-col justify-between">
            <div>
              <div className="text-sm text-muted">Failed runs this week</div>
              <div className="mt-1 text-2xl font-semibold">{s?.errors_7d ?? "—"}</div>
            </div>
            <Link href="/assets" className="btn mt-6 self-start">Open assets</Link>
          </div>
          <Dashes values={daily.map((d) => d.errors)} color="#e5484d" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Your first steps</h2>
        <p className="mt-1 text-muted">Three quick things and you&apos;re creating.</p>
        <div className="card mt-6 grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="space-y-5 p-5">
            <div>
              <h3 className="text-base font-semibold">Set up your account</h3>
              <p className="mt-1 text-sm text-muted">Sign in, grab your starter credits and make something.</p>
            </div>
            <Step done label="Create an account" />
            <Step done={!!s && (s.unlimited || (s.credits ?? 0) > 0)} label="Claim starter credits" href="/usage" cta="View credits" />
            <Step done={!!s && s.requests_7d > 0} label="Make your first image or video" href="/explore" cta="Try a model" />
          </div>
          <div className="space-y-5 p-5">
            <div>
              <h3 className="text-base font-semibold">Ways to create</h3>
              <p className="mt-1 text-sm text-muted">Chat with the agent or open any model.</p>
            </div>
            <QuickLink href="/agent" icon={LayoutGrid} label="Open the Agent" />
            <QuickLink href="/explore" icon={ImageIcon} label="Try an image model" />
            <QuickLink href="/assets" icon={FileText} label="See your assets" />
            <QuickLink href="/account#billing" icon={CircleDollarSign} label="Redeem a credit code" />
          </div>
          <div className="space-y-5 p-5">
            <div>
              <h3 className="text-base font-semibold">{recent.length ? "Your recent models" : "Popular right now"}</h3>
              <p className="mt-1 text-sm text-muted">Good places to start for images and video.</p>
            </div>
            {(recent.length ? recent : [getModel("google/nano-banana-2"), getModel("vidu/vidu-q3-i2v"), getModel("pruna/p-video")].filter((m): m is NonNullable<typeof m> => Boolean(m)))
              .slice(0, 3)
              .map((m) => <ModelRow key={m.id} model={m} />)}
            <QuickLink href="/explore" icon={LayoutGrid} label="Browse every model" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Your recent work</h2>
          <Link href="/assets" className="btn">See all <ArrowRight size={15} /></Link>
        </div>
        {items === null ? (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer aspect-square rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card mt-5 flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-panel-2 text-muted"><ImageIcon size={22} /></span>
            <div className="text-lg font-semibold">Your gallery is empty</div>
            <p className="max-w-md text-muted">Everything you generate shows up here. Ask the agent for an idea or open any model to make your first piece.</p>
            <div className="mt-2 flex gap-2">
              <Link href="/agent" className="btn btn-primary">Open the Agent</Link>
              <Link href="/explore" className="btn">Explore models</Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {items.map((g) => (
              <Link key={g.request_id} href={`/assets?id=${g.request_id}`} className="card overflow-hidden">
                <div className="aspect-square bg-panel-2">
                  {g.media[0] ? <Media url={g.media[0]} kind={g.kind} className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-dim">{g.status}</div>}
                </div>
                <div className="truncate px-2.5 py-2 text-xs text-muted">{g.model_id}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Step({ done, label, href, cta }: { done: boolean; label: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-[#1f3326] text-[#4ade80]" : "bg-panel-2"}`}>
        {done && <Check size={16} />}
      </span>
      <span className={`flex-1 text-sm ${done ? "text-muted line-through" : ""}`}>{label}</span>
      {!done && href && <Link href={href} className="btn">{cta}</Link>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof BookOpen; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md text-sm hover:text-white">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-panel-2 text-muted"><Icon size={15} strokeWidth={1.8} /></span>
      <span>{label}</span>
    </Link>
  );
}
