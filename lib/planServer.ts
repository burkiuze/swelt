import "server-only";
import { dbEnabled, listCodes, type RedeemCode } from "./db";
import { PLAN_DAYS, planOfCode, planRank, type PlanKey } from "./plans";

// The active plan is the best plan code the user redeemed in the last PLAN_DAYS days.
let cache: { at: number; rows: RedeemCode[] } | null = null;

async function redeemed(): Promise<RedeemCode[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.rows;
  const rows = (await listCodes(1000)).filter((c) => c.redeemed_by);
  cache = { at: Date.now(), rows };
  return rows;
}

export const forgetPlans = () => {
  cache = null;
};

export async function getPlan(userId: string, isAdmin: boolean): Promise<{ plan: PlanKey; expires: string | null }> {
  if (isAdmin) return { plan: "ultra", expires: null };
  if (!dbEnabled()) return { plan: "free", expires: null };
  const since = Date.now() - PLAN_DAYS * 86_400_000;
  let best: { plan: PlanKey; expires: string | null } = { plan: "free", expires: null };
  for (const c of await redeemed().catch(() => [] as RedeemCode[])) {
    if (c.redeemed_by !== userId || !c.redeemed_at) continue;
    const at = new Date(c.redeemed_at).getTime();
    const plan = planOfCode(c.code);
    if (!plan || at < since) continue;
    const expires = new Date(at + PLAN_DAYS * 86_400_000).toISOString();
    if (planRank(plan) > planRank(best.plan) || (plan === best.plan && expires > (best.expires ?? ""))) best = { plan, expires };
  }
  return best;
}
