// Shared (client + server) plan definitions. Plans are sold as single-use codes
// (VLIPA-<PLAN>-XXXX-XXXX-XXXX); redeeming one adds its credits and unlocks the
// plan's agent models for PLAN_DAYS days.
import { LLMS, type LlmKey } from "./llm";

export type PlanKey = "free" | "starter" | "pro" | "ultra";
export const PLAN_DAYS = 30;

export const PLANS: {
  key: Exclude<PlanKey, "free">;
  name: string;
  price: number;
  was: number;
  credits: number;
  blurb: string;
  ultraLlms: boolean;
  badge?: string;
}[] = [
  { key: "starter", name: "Starter", price: 5, was: 10, credits: 5, blurb: "Try every model and see what you like.", ultraLlms: false },
  { key: "pro", name: "Pro", price: 20, was: 40, credits: 20, blurb: "For regular creators who post every week.", ultraLlms: false, badge: "Most popular" },
  { key: "ultra", name: "Ultra", price: 50, was: 100, credits: 50, blurb: "The most credits plus the top agent models.", ultraLlms: true, badge: "Best value" },
];

const RANK: Record<PlanKey, number> = { free: 0, starter: 1, pro: 2, ultra: 3 };
export const planRank = (p: PlanKey) => RANK[p];
export const planName = (p: PlanKey) => (p === "free" ? "Free" : PLANS.find((x) => x.key === p)!.name);

export function planOfCode(code: string): PlanKey | null {
  const m = code.toUpperCase().match(/^VLIPA-(STARTER|PRO|ULTRA)-/);
  return m ? (m[1].toLowerCase() as PlanKey) : null;
}

export function llmAllowed(plan: PlanKey, key: LlmKey) {
  const l = LLMS.find((x) => x.key === key);
  return !!l && (!l.ultra || plan === "ultra");
}

export const defaultLlm = (plan: PlanKey): LlmKey => (plan === "ultra" ? "opus" : "glm");
