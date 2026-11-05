import "server-only";
import { put } from "@vercel/blob";

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Copy a (possibly short-lived) provider URL into Vercel Blob so assets stay available. */
export async function persistMedia(url: string, name: string, kind: "image" | "video"): Promise<string> {
  if (!blobEnabled()) return url;
  try {
    let body: Blob;
    let type: string;
    if (url.startsWith("data:")) {
      const [meta, b64] = url.split(",", 2);
      type = meta.slice(5).split(";")[0] || "image/png";
      body = new Blob([Buffer.from(b64, "base64")], { type });
    } else {
      const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      if (!res.ok) return url;
      type = res.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/png");
      body = await res.blob();
    }
    const ext = type.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") || (kind === "video" ? "mp4" : "png");
    const out = await put(`outputs/${name}.${ext}`, body, { access: "public", contentType: type, addRandomSuffix: true });
    return out.url;
  } catch {
    return url;
  }
}

export async function uploadFile(file: File, userId: string): Promise<string> {
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "upload";
  const out = await put(`uploads/${userId}/${safe}`, file, { access: "public", contentType: file.type, addRandomSuffix: true });
  return out.url;
}
