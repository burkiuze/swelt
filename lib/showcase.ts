import "server-only";
import { dbEnabled, listShowcase } from "./db";
import { OFFICIAL_PREVIEWS } from "./officialPreviews";

export type Preview = { url: string; kind: "image" | "video"; source?: string };
export type PreviewMap = Record<string, Preview>;

/** Model id → preview media. Swelt-generated previews win over the official repo samples. */
export async function getPreviews(): Promise<PreviewMap> {
  const map: PreviewMap = Object.fromEntries(Object.entries(OFFICIAL_PREVIEWS).map(([k, v]) => [k, { url: v.url, kind: v.kind, source: v.source }]));
  if (!dbEnabled()) return map;
  try {
    for (const r of await listShowcase()) map[r.model_id] = { url: r.media_url, kind: r.kind };
  } catch {
    // keep the static previews
  }
  return map;
}
