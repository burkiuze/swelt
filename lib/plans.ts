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

// Code chat model families. The model list itself is read live from OpenRouter (text models only).
export const CODE_VENDORS = [
  { key: "tencent", label: "Tencent", logo: "/brand/labs/color/tencent.svg", prefixes: ["tencent/"] },
  { key: "z-ai", label: "Z.ai", logo: "/brand/labs/color/z-ai.svg", prefixes: ["z-ai/"] },
  { key: "deepseek", label: "DeepSeek", logo: "/brand/labs/color/deepseek.svg", prefixes: ["deepseek/"] },
  { key: "nvidia", label: "NVIDIA", logo: "/brand/labs/color/nvidia.svg", prefixes: ["nvidia/"] },
  { key: "qwen", label: "Qwen", logo: "/brand/labs/color/qwen.svg", prefixes: ["qwen/"] },
  { key: "meta", label: "Meta", logo: "/brand/labs/color/meta.svg", prefixes: ["meta-llama/", "meta/"] },
] as const;
export type CodeVendorKey = (typeof CODE_VENDORS)[number]["key"];
export type CodeModel = { id: string; name: string; vendor: CodeVendorKey; max: boolean; reasoning: boolean; isNew: boolean };
export const CODE_DEFAULT_MODEL = "z-ai/glm-5.3-flash";
export const CODE_EFFORTS = ["low", "medium", "high"] as const;
export type CodeEffort = (typeof CODE_EFFORTS)[number];
export const codeVendorOf = (id: string) => CODE_VENDORS.find((v) => v.prefixes.some((p) => id.startsWith(p)));

export const isCodeCode = (code: string) => /^VLIPA-CODE-/i.test(code);
