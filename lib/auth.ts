import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { dbEnabled, ensureProfile, resolveApiKey, type Profile } from "./db";

export type Caller = { userId: string; email: string | null; via: "session" | "key"; profile: Profile | null; isAdmin: boolean };

export const freeCredits = () => Number(process.env.FREE_CREDITS ?? "1");

function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

export function newApiKey() {
  const raw = `swk_${randomBytes(24).toString("base64url")}`;
  return { raw, prefix: raw.slice(0, 10), hash: hashKey(raw) };
}

/** Resolve the caller from the Vlipa session (API keys are disabled). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCaller(req?: Request): Promise<Caller | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const email = session.user?.email ?? null;
  const profile = dbEnabled() ? await ensureProfile(userId, email, freeCredits()) : null;
  return { userId, email, via: "session", profile, isAdmin: !!email && adminEmails().includes(email.toLowerCase()) };
}

export function unauthorized(msg = "Sign in to continue") {
  return Response.json({ error: msg }, { status: 401 });
}
