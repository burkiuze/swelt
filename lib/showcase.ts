import "server-only";
import { dbEnabled, listShowcase } from "./db";

export type Preview = { url: string; kind: "image" | "video" };
export type PreviewMap = Record<string, Preview>;

/** Model id → preview media (image or video) shown on cards. Empty when Supabase is off or on error. */
export async function getPreviews(): Promise<PreviewMap> {
  if (!dbEnabled()) return {};
  try {
    const rows = await listShowcase();
    return Object.fromEntries(rows.map((r) => [r.model_id, { url: r.media_url, kind: r.kind }]));
  } catch {
    return {};
  }
}
