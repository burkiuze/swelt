import Link from "next/link";
import { MODELS } from "@/lib/catalog";

export const metadata = { title: "API docs — Vlipa" };

const pre = "overflow-x-auto rounded-lg border border-line bg-sunken p-4 text-[13px] leading-relaxed text-zinc-300";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-7">
      <div>
        <h1 className="text-3xl font-semibold">Quickstart: call your first model</h1>
        <p className="mt-2 text-muted">Every model in Vlipa is available over one small async HTTP API.</p>
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Get an API key</h2>
        <p className="text-muted">Create one on the <Link href="/keys" className="text-white underline underline-offset-2">API Keys</Link> page and export it as <code>SWELT_KEY</code>.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Submit a request</h2>
        <pre className={pre}>{`POST /api/run
Authorization: Key $SWELT_KEY
Content-Type: application/json

{ "model": "black-forest-labs/flux-1-schnell", "input": { "prompt": "a lemon cheesecake, watercolor" } }

→ 202 { "request_id": "6f1c…", "status": "IN_QUEUE", "media": [], … }`}</pre>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Poll for the result</h2>
        <pre className={pre}>{`GET /api/requests/{request_id}
Authorization: Key $SWELT_KEY

→ 200 { "status": "COMPLETED", "media": ["https://…/output.png"], "cost": 0.0024, "output": { … } }`}</pre>
        <p className="text-muted">Statuses: <code>IN_QUEUE</code>, <code>IN_PROGRESS</code>, <code>COMPLETED</code>, <code>FAILED</code>. Images usually finish in seconds, videos in 1–5 minutes.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Other endpoints</h2>
        <ul className="list-inside list-disc space-y-1 text-muted">
          <li><code>GET /api/generations?kind=image|video&amp;limit=50</code> — your history</li>
          <li><code>GET /api/stats</code> — requests, errors, spend and credit balance</li>
          <li><code>POST /api/upload</code> (multipart <code>file</code>) — upload a reference image, returns <code>{"{ url }"}</code></li>
          <li><code>POST /api/agent</code> — <code>{"{ messages, llm: \"opus\"|\"sol\", effort, approval }"}</code> — the Vlipa Agent</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Models</h2>
        <div className="card divide-y divide-line">
          {MODELS.map((m) => (
            <Link key={m.id} href={`/models/${m.id}`} className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-panel-2">
              <code>{m.id}</code>
              <span className="shrink-0 text-dim">{m.category} · {m.priceLabel}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
