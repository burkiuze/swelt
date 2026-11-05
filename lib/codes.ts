import "server-only";
import { randomInt } from "node:crypto";
import type { PlanKey } from "./plans";

// No 0/O/1/I/L to avoid typos when codes are copied by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newCode(plan: PlanKey | null = null) {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `VLIPA-${plan && plan !== "free" ? `${plan.toUpperCase()}-` : ""}${group()}-${group()}-${group()}`;
}

export const normalizeCode = (raw: string) =>
  raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 48);
