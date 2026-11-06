// Shared (client + server) plan definitions. Plans are sold as single-use codes
// (VLIPA-<PLAN>-XXXX-XXXX-XXXX); redeeming one adds its credits and unlocks the
// plan for PLAN_DAYS days.
import { LLMS, type LlmKey } from "./llm";

export type PlanKey = "free" | "premium" | "pro" | "ultra";
export const PLAN_DAYS = 30;

export const PLANS: {
  key: Exclude<PlanKey, "free">;
  name: string;
  price: number;
  was: number;
  credits: number; // total credits added (price + bonus)
  bonus?: number; // extra credits on top of the price
  blurb: string;
  ultraLlms: boolean;
  allModels: boolean; // false = OpenRouter models only
  badge?: string;
}[] = [
  { key: "premium", name: "Premium", price: 5, was: 10, credits: 5, blurb: "Every OpenRouter image and video model.", ultraLlms: false, allModels: false },
  { key: "pro", name: "Pro", price: 20, was: 40, credits: 28, bonus: 8, blurb: "Adds Kling 4.0, Genjutsu and Marketing Studio.", ultraLlms: false, allModels: true, badge: "Most popular" },
  { key: "ultra", name: "Ultra", price: 50, was: 100, credits: 65, bonus: 15, blurb: "Top agent models plus every fal model.", ultraLlms: true, allModels: true, badge: "Best value" },
];

const RANK: Record<PlanKey, number> = { free: 0, premium: 1, pro: 2, ultra: 3 };
export const planRank = (p: PlanKey) => RANK[p];
export const planName = (p: PlanKey) => (p === "free" ? "Free" : PLANS.find((x) => x.key === p)!.name);

export function planOfCode(code: string): PlanKey | null {
  const m = code.toUpperCase().match(/^VLIPA-(PREMIUM|STARTER|PRO|ULTRA)-/);
  if (!m) return null;
  return m[1] === "STARTER" ? "premium" : (m[1].toLowerCase() as PlanKey);
}

export function llmAllowed(plan: PlanKey, key: LlmKey) {
  const l = LLMS.find((x) => x.key === key);
  return !!l && (!l.ultra || plan === "ultra");
}

export const defaultLlm = (plan: PlanKey): LlmKey => (plan === "ultra" ? "opus" : "glm");

/** Free and Premium: OpenRouter only. Pro: + Higgsfield and RunPod. Ultra: everything, including fal. */
export function modelAllowed(plan: PlanKey, model: { provider?: string }) {
  if (model.provider === "fal") return plan === "ultra";
  return plan === "pro" || plan === "ultra" || model.provider === "openrouter";
}

/* ---------------- Code membership (separate from the media plans) ---------------- */

export const CODE_PLAN = {
  key: "code" as const,
  name: "Code",
  price: 5,
  was: 10,
  days: PLAN_DAYS,
  dailyLimit: 100,
  blurb: "A fast coding assistant: 100 messages a day.",
};

// Coding models (OpenRouter slugs), always routed to the cheapest provider. `ultra` models also need
// the Ultra media plan; `hint` lets the server find the live slug by name if the guessed one is wrong.
export const CODE_MODELS = [
  { key: "minimax", label: "MiniMax M3.1 Flash", vendor: "MiniMax", lab: "minimax", slug: "minimax/minimax-m3.1-flash", hint: "minimax.*m3\\.1.*flash", ultra: false, isNew: false },
  { key: "deepseek", label: "DeepSeek V4.1 Flash", vendor: "DeepSeek", lab: "deepseek", slug: "deepseek/deepseek-v4.1-flash-1017", hint: "deepseek.*v4\\.1.*flash", ultra: false, isNew: false },
  { key: "glm", label: "GLM 5.3 Flash", vendor: "Z.ai", lab: "z-ai", slug: "z-ai/glm-5.3-flash", hint: "glm.*5\\.3.*flash", ultra: false, isNew: false },
  { key: "hy4", label: "Tencent HY4", vendor: "Tencent", lab: "tencent", slug: "tencent/hy4", hint: "tencent.*(hy|hunyuan)[- ]?4", ultra: false, isNew: true },
  { key: "muse", label: "Muse Spark 1.3", vendor: "Meta", lab: "meta", slug: "meta/muse-spark-1.3-contributor", hint: "muse.*spark.*1\\.3", ultra: false, isNew: true },
  { key: "opus", label: "Claude Opus 5.5", vendor: "Anthropic", lab: "anthropic", slug: "anthropic/claude-opus-5.5", hint: "claude.*opus.*5\\.5", ultra: true, isNew: false },
  { key: "sol", label: "GPT-6.1 Sol", vendor: "OpenAI", lab: "openai", slug: "openai/gpt-6.1-sol", hint: "gpt-6\\.1.*sol", ultra: true, isNew: false },
] as const;
export type CodeModelKey = (typeof CODE_MODELS)[number]["key"];

export const isCodeCode = (code: string) => /^VLIPA-CODE-/i.test(code);
