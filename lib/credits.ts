// Credits are shown to users as whole numbers: 1 USD of balance = 1,000 credits.
// Balances and costs are still stored in USD internally.
export const CREDITS_PER_USD = 1000;

export const toCredits = (usd: number | null | undefined) => Math.round(Number(usd ?? 0) * CREDITS_PER_USD);

/** "4,500" */
export const fmtCredits = (usd: number | null | undefined) => toCredits(usd).toLocaleString("en-US");

/** "4,500 credits" */
export const creditsLabel = (usd: number | null | undefined) => {
  const n = toCredits(usd);
  return `${n.toLocaleString("en-US")} credit${n === 1 ? "" : "s"}`;
};
