// Live list of Code chat models from OpenRouter: text-in/text-out models of the CODE_VENDORS families.
import { CODE_DEFAULT_MODEL, codeVendorOf, type CodeModel } from "./plans";

type OrModel = {
  id: string;
  name?: string;
  created?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
};

// Fallback when OpenRouter can't be reached.
const FALLBACK: CodeModel[] = [
  { id: CODE_DEFAULT_MODEL, name: "GLM 5.3 Flash", vendor: "z-ai", max: false, reasoning: true, isNew: false },
  { id: "deepseek/deepseek-v4.1-flash-1017", name: "DeepSeek V4.1 Flash", vendor: "deepseek", max: false, reasoning: true, isNew: false },
];

let cache: { at: number; models: CodeModel[] } | null = null;
const DAY = 86_400;

export async function codeCatalog(): Promise<CodeModel[]> {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.models;
  const data = await fetch("https://openrouter.ai/api/v1/models", { cache: "no-store", signal: AbortSignal.timeout(10_000) })
    .then((r) => r.json())
    .then((j) => (j?.data ?? []) as OrModel[])
    .catch(() => [] as OrModel[]);
  const now = Date.now() / 1000;
  const found: { m: CodeModel; created: number }[] = [];
  for (const m of data) {
    const v = codeVendorOf(m.id);
    if (!v || m.id.endsWith(":free") || /guard|embed|rerank|safety|reward/i.test(m.id)) continue;
    const out = m.architecture?.output_modalities ?? ["text"];
    const inp = m.architecture?.input_modalities ?? ["text"];
    if (!out.includes("text") || out.some((x) => x !== "text") || !inp.includes("text")) continue;
    const prompt = Number(m.pricing?.prompt ?? 0);
    const completion = Number(m.pricing?.completion ?? 0);
    if (prompt < 0 || completion < 0) continue; // "-1" = variable/router pricing
    found.push({ created: m.created ?? 0, m: {
      id: m.id,
      name: (m.name || m.id).replace(/^[^:]{1,40}:\s*/, ""),
      vendor: v.key,
      // Pricier models are Ultra-only ("Max"): > $0.60 per 1M input or > $2.50 per 1M output tokens.
      max: prompt > 0.6e-6 || completion > 2.5e-6,
      reasoning: !!m.supported_parameters?.includes("reasoning"),
      isNew: !!m.created && now - m.created < 30 * DAY,
    } });
  }
  found.sort((a, b) => b.created - a.created);
  const list = found.length ? found.map((f) => f.m) : FALLBACK;
  if (found.length) cache = { at: Date.now(), models: list };
  return list;
}
