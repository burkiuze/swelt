// Stores media in the public `media` bucket for the Swelt server.
// Auth: the caller must send x-swelt-secret whose SHA-256 matches SECRET_SHA256 (same secret the DB RPCs use).
// Body: JSON { source_url, path } to copy a remote file, or raw bytes with ?path=...&type=... to upload directly.
// ?action=cleanup&prefix=uploads&hours=48 deletes files under <prefix>/ older than <hours> (max 5000 per call).
// ?action=profiles lists user profiles (id, email, credits, created_at) for the admin page.
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
  if (url.searchParams.get("action") === "cleanup") return cleanup(url);
  if (url.searchParams.get("action") === "profiles") return profiles();
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

const ALLOWED_PREFIXES = ["uploads", "outputs"];

async function cleanup(url: URL) {
  const prefix = url.searchParams.get("prefix") || "uploads";
  const hours = Math.max(1, Number(url.searchParams.get("hours") || 48));
  if (!ALLOWED_PREFIXES.includes(prefix)) return json({ error: "bad prefix" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = Date.now() - hours * 3_600_000;
  const old: string[] = [];
  let scanned = 0;

  // Walk <prefix>/ and one level of sub-folders (uploads/<user>/<file>).
  const walk = async (dir: string, depth: number) => {
    for (let offset = 0; old.length < 5000; offset += 1000) {
      const { data, error } = await sb.storage.from("media").list(dir, { limit: 1000, offset, sortBy: { column: "created_at", order: "asc" } });
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      for (const o of data) {
        const full = `${dir}/${o.name}`;
        if (!o.id) {
          if (depth < 2) await walk(full, depth + 1);
          continue;
        }
        scanned++;
        const t = new Date(o.created_at || o.updated_at || 0).getTime();
        if (t && t < cutoff) old.push(full);
      }
      if (data.length < 1000) break;
    }
  };

  try {
    await walk(prefix, 0);
    let removed = 0;
    for (let i = 0; i < old.length; i += 500) {
      const { data, error } = await sb.storage.from("media").remove(old.slice(i, i + 500));
      if (error) throw new Error(error.message);
      removed += data?.length ?? 0;
    }
    return json({ prefix, hours, scanned, removed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

async function profiles() {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const items: unknown[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await sb.from("profiles").select("user_id,email,credits,created_at").order("created_at", { ascending: false }).range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    items.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return json({ items });
}
