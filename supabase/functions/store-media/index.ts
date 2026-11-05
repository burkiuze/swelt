// Stores media in the public `media` bucket for the Swelt server.
// Auth: the caller must send x-swelt-secret whose SHA-256 matches SECRET_SHA256 (same secret the DB RPCs use).
// Body: JSON { source_url, path } to copy a remote file, or raw bytes with ?path=...&type=... to upload directly.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET_SHA256 = "08671251fbebfed4812e1c87b112aeaeefd889674ef1297420c853825de09425";
const MAX = 100 * 1024 * 1024;

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = req.headers.get("x-swelt-secret") || "";
  if ((await sha256(secret)) !== SECRET_SHA256) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  let path = url.searchParams.get("path") || "";
  let type = url.searchParams.get("type") || "";
  let bytes: Uint8Array;

  if ((req.headers.get("content-type") || "").startsWith("application/json")) {
    const body = await req.json();
    path = body.path || path;
    const src = String(body.source_url || "");
    if (!/^https:\/\//.test(src)) return json({ error: "source_url must be https" }, 400);
    const r = await fetch(src, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) return json({ error: `fetch ${r.status}` }, 502);
    type = r.headers.get("content-type") || type || "application/octet-stream";
    bytes = new Uint8Array(await r.arrayBuffer());
  } else {
    bytes = new Uint8Array(await req.arrayBuffer());
    type = type || req.headers.get("content-type") || "application/octet-stream";
  }

  if (!path || path.includes("..") || path.startsWith("/")) return json({ error: "bad path" }, 400);
  if (!/^(image|video|audio)\//.test(type)) return json({ error: `unsupported type ${type}` }, 415);
  if (bytes.byteLength > MAX) return json({ error: "too large" }, 413);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await sb.storage.from("media").upload(path, bytes, { contentType: type, upsert: true });
  if (error) return json({ error: error.message }, 500);
  const { data } = sb.storage.from("media").getPublicUrl(path);
  return json({ url: data.publicUrl, type });
});
