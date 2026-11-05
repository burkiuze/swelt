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
  { key: "ultra", name: "Ultra", price: 50, was: 100, credits: 65, bonus: 15, blurb: "The most credits plus the top agent models.", ultraLlms: true, allModels: true, badge: "Best value" },
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

/** Free and Premium use OpenRouter models only; Pro and Ultra get every provider. */
export function modelAllowed(plan: PlanKey, model: { provider?: string }) {
  return plan === "pro" || plan === "ultra" || model.provider === "openrouter";
}
