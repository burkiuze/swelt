import "server-only";
import { dbEnabled, listCodes, type RedeemCode } from "./db";
import { CODE_PLAN, isCodeCode, PLAN_DAYS, planOfCode, planRank, type PlanKey } from "./plans";

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

/** Active plan per user id (for the admin users page). */
export async function plansByUser(): Promise<Map<string, { plan: PlanKey; expires: string | null; codes: number }>> {
  const out = new Map<string, { plan: PlanKey; expires: string | null; codes: number }>();
  const since = Date.now() - PLAN_DAYS * 86_400_000;
  for (const c of await redeemed().catch(() => [] as RedeemCode[])) {
    if (!c.redeemed_by || !c.redeemed_at) continue;
    const cur = out.get(c.redeemed_by) ?? { plan: "free" as PlanKey, expires: null, codes: 0 };
    cur.codes++;
    const at = new Date(c.redeemed_at).getTime();
    const plan = planOfCode(c.code);
    if (plan && at >= since) {
      const expires = new Date(at + PLAN_DAYS * 86_400_000).toISOString();
      if (planRank(plan) > planRank(cur.plan) || (plan === cur.plan && expires > (cur.expires ?? ""))) {
        cur.plan = plan;
        cur.expires = expires;
      }
    }
    out.set(c.redeemed_by, cur);
  }
  return out;
}

/** Code membership: active while a VLIPA-CODE- code was redeemed within CODE_PLAN.days. */
export async function getCodeAccess(userId: string, isAdmin: boolean): Promise<{ active: boolean; expires: string | null }> {
  if (isAdmin) return { active: true, expires: null };
  if (!dbEnabled()) return { active: false, expires: null };
  let expires: string | null = null;
  for (const c of await redeemed().catch(() => [] as RedeemCode[])) {
    if (c.redeemed_by !== userId || !c.redeemed_at || !isCodeCode(c.code)) continue;
    const e = new Date(new Date(c.redeemed_at).getTime() + CODE_PLAN.days * 86_400_000).toISOString();
    if (e > (expires ?? "")) expires = e;
  }
  return expires && new Date(expires).getTime() > Date.now() ? { active: true, expires } : { active: false, expires: null };
}

/** Code membership expiry per user id (admin users page). */
export async function codeAccessByUser(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const c of await redeemed().catch(() => [] as RedeemCode[])) {
    if (!c.redeemed_by || !c.redeemed_at || !isCodeCode(c.code)) continue;
    const e = new Date(new Date(c.redeemed_at).getTime() + CODE_PLAN.days * 86_400_000).toISOString();
    if (new Date(e).getTime() > Date.now() && e > (out.get(c.redeemed_by) ?? "")) out.set(c.redeemed_by, e);
  }
  return out;
}
