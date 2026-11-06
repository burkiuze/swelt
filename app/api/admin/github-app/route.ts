import { getCaller } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// GitHub App manifest flow: GitHub redirects here with ?code=; exchange it for the app credentials
// and show them once to the admin so they can be added to the Vercel environment.
export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller?.isAdmin) return new Response("Not found", { status: 404 });
  const code = new URL(req.url).searchParams.get("code");
  if (!code || !/^[\w-]+$/.test(code)) return new Response("Missing code", { status: 400 });
  const r = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Vlipa-Code" },
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as { slug?: string; client_id?: string; client_secret?: string; html_url?: string; message?: string };
  if (!r.ok || !j.client_id) return new Response(`GitHub: ${j.message || r.status}`, { status: 502 });
  const rows: [string, string][] = [
    ["GITHUB_APP_SLUG", j.slug || ""],
    ["GITHUB_APP_CLIENT_ID", j.client_id],
    ["GITHUB_APP_CLIENT_SECRET", j.client_secret || ""],
  ];
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitHub App created</title>
<body style="font-family:system-ui;background:#111;color:#eee;max-width:720px;margin:40px auto;padding:0 16px">
<h1>GitHub App created</h1>
<p>Add these to Vercel → Project vl1pa → Settings → Environment Variables (Production), then redeploy. This page is shown only once.</p>
${rows.map(([k, v]) => `<p><b>${k}</b><br><code style="display:block;background:#222;padding:10px;border-radius:8px;word-break:break-all;user-select:all">${esc(v)}</code></p>`).join("")}
<p><a style="color:#9cf" href="${esc(j.html_url || "https://github.com/settings/apps")}">App settings on GitHub</a> · <a style="color:#9cf" href="/admin/github">Back</a></p>
</body>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
