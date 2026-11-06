import "server-only";

// Media persistence through the Supabase `store-media` Edge Function (public `media` bucket).
// The function checks SWELT_DB_SECRET, so only this server can write.

export const storageEnabled = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SWELT_DB_SECRET);

function endpoint(query = "") {
  return `${process.env.SUPABASE_URL}/functions/v1/store-media${query}`;
}

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    apikey: process.env.SUPABASE_ANON_KEY!,
    "x-swelt-secret": process.env.SWELT_DB_SECRET!,
    ...extra,
  };
}

const extOf = (type: string, kind: string) =>
  type.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg").replace("quicktime", "mov") || (kind === "video" ? "mp4" : "png");

export async function putBytes(path: string, body: Blob | Buffer, type: string): Promise<string> {
  const res = await fetch(endpoint(`?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}`), {
    method: "POST",
    headers: headers({ "content-type": type }),
    body: body as BodyInit,
    signal: AbortSignal.timeout(90_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || `store-media ${res.status}`);
  return data.url;
}

/** Copy a (possibly short-lived) provider URL into Supabase Storage so assets stay available. */
export async function persistMedia(url: string, name: string, kind: "image" | "video" | "audio"): Promise<string> {
  if (!storageEnabled()) return url;
  try {
    if (url.startsWith("data:")) {
      const [meta, b64] = url.split(",", 2);
      const type = meta.slice(5).split(";")[0] || "image/png";
      return await putBytes(`outputs/${name}.${extOf(type, kind)}`, Buffer.from(b64, "base64"), type);
    }
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ source_url: url, path: `outputs/${name}.${kind === "video" ? "mp4" : kind === "audio" ? "mp3" : "png"}` }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.url ? data.url : url;
  } catch {
    return url;
  }
}

export async function uploadFile(file: File, userId: string): Promise<string> {
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-60) || "upload";
  const path = `uploads/${userId.replace(/[^A-Za-z0-9_-]/g, "")}/${Date.now()}-${safe}`;
  return putBytes(path, Buffer.from(await file.arrayBuffer()), file.type);
}

export type ProfileRow = { user_id: string; email: string | null; credits: number | string; created_at: string };

/** All user profiles (service role, via the secret-protected Edge Function). Admin use only. */
export async function listProfiles(): Promise<ProfileRow[]> {
  if (!storageEnabled()) return [];
  const res = await fetch(endpoint("?action=profiles"), { method: "POST", headers: headers(), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `profiles ${res.status}`);
  return Array.isArray(data.items) ? data.items : [];
}
