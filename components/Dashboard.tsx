"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, BookOpen, Check, ImageIcon, KeyRound, LayoutGrid, Plug } from "lucide-react";
import { getModel } from "@/lib/catalog";
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
type Item = { request_id: string; model_id: string; status: string; media: string[]; kind: string; created_at?: string };

function Bars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-20 flex-1 items-end gap-1 rounded-md bg-panel-2 p-2">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: color, opacity: v ? 1 : 0.35 }} />
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
  const recent = (s?.recent_models || []).map(getModel).filter(Boolean);

  return (
    <div className="space-y-10">
      <section className="card grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="flex gap-8 p-5">
          <div>
            <div className="text-sm text-muted">Credits balance</div>
            <div className="mt-1 text-2xl font-semibold">{s ? (s.unlimited ? "Unlimited" : `$${(s.credits ?? 0).toFixed(2)}`) : "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Cost in the last 7 days</div>
            <div className="mt-1 text-2xl font-semibold">{s ? `$${Number(s.cost_7d).toFixed(2)}` : "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5">
          <div>
            <div className="text-sm text-muted">Requests (7 days)</div>
            <div className="mt-1 text-2xl font-semibold">{s?.requests_7d ?? "—"}</div>
            <Link href="/usage" className="btn mt-3">Check usage</Link>
          </div>
          <Bars values={daily.map((d) => d.requests)} color="#7c3aed" />
        </div>
        <div className="flex items-center gap-4 p-5">
          <div>
            <div className="text-sm text-muted">Errors (7 days)</div>
            <div className="mt-1 text-2xl font-semibold">{s?.errors_7d ?? "—"}</div>
            <Link href="/assets" className="btn mt-3">See requests</Link>
          </div>
          <Bars values={daily.map((d) => d.errors)} color="#f43f5e" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Getting started</h2>
        <p className="text-sm text-muted">Start exploring Swelt&apos;s capabilities</p>
        <div className="card mt-4 grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="space-y-4 p-5">
            <h3 className="text-lg font-semibold">Welcome to Swelt!</h3>
            <p className="text-sm text-muted">Your account is ready to generate content or call the API.</p>
            <Step done label="Create an account" />
            <Step done={!!s && (s.unlimited || (s.credits ?? 0) > 0)} label="Get free starter credits" />
            <Step done={!!s && s.requests_7d > 0} label="Generate your first media" href="/explore" cta="Try a model" />
          </div>
          <div className="space-y-3 p-5">
            <h3 className="text-lg font-semibold">Start creating with Swelt</h3>
            <p className="text-sm text-muted">Generate in the browser or call any model from code.</p>
            <QuickLink href="/agent" icon={LayoutGrid} label="Generate with the Agent" />
            <QuickLink href="/keys" icon={KeyRound} label="Get an API key" />
            <QuickLink href="/docs" icon={Plug} label="Quickstart: call your first model" />
            <QuickLink href="/docs" icon={BookOpen} label="Go to documentation" />
          </div>
          <div className="space-y-3 p-5">
            <h3 className="text-lg font-semibold">Recently used models</h3>
            {recent.length ? (
              recent.slice(0, 3).map((m) => <ModelRow key={m!.id} model={m!} />)
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
                <Activity size={20} /> No models used yet.
                <Link href="/explore" className="btn">Explore models</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Latest generations</h2>
          <Link href="/assets" className="btn">See all →</Link>
        </div>
        {items === null ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer aspect-square rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center gap-3 py-16 text-center">
            <ImageIcon className="text-dim" />
            <div className="font-semibold">Nothing here… yet.</div>
            <p className="max-w-md text-sm text-muted">Start your first generation and see your creations come to life. Try the Agent or pick a model to begin.</p>
            <div className="flex gap-2">
              <Link href="/agent" className="btn btn-primary">Try the Agent</Link>
              <Link href="/explore" className="btn">Explore models</Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {items.map((g) => (
              <Link key={g.request_id} href={`/assets?id=${g.request_id}`} className="card group overflow-hidden">
                <div className="aspect-square bg-panel-2">
                  {g.media[0] ? <Media url={g.media[0]} kind={g.kind} className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-dim">{g.status}</div>}
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-muted">{g.model_id}</div>
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
    <div className="flex items-center gap-3">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-400" : "bg-panel-2"}`}>
        {done && <Check size={15} />}
      </span>
      <span className={`flex-1 ${done ? "text-muted line-through" : ""}`}>{label}</span>
      {!done && href && <Link href={href} className="btn">{cta}</Link>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Plug; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md p-1 hover:bg-panel-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/15 text-violet-300"><Icon size={16} /></span>
      <span>{label}</span>
    </Link>
  );
}
