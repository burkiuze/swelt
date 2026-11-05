import "server-only";
import { dbEnabled, listShowcase } from "./db";
import { OFFICIAL_PREVIEWS } from "./officialPreviews";

export type Preview = { url: string; kind: "image" | "video"; source?: string };
export type PreviewMap = Record<string, Preview>;

/** Model id → preview media. Samples found online win over previews generated in Swelt. */
export async function getPreviews(): Promise<PreviewMap> {
  const map: PreviewMap = Object.fromEntries(Object.entries(OFFICIAL_PREVIEWS).map(([k, v]) => [k, { url: v.url, kind: v.kind, source: v.source }]));
  if (!dbEnabled()) return map;
  try {
    // Online samples win; generated previews only fill models that have none.
    for (const r of await listShowcase()) map[r.model_id] ??= { url: r.media_url, kind: r.kind };
  } catch {
    // keep the static previews
  }
  return map;
}
