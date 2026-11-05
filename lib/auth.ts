import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
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

/** Resolve the caller from a Clerk session or an `Authorization: Key swk_...` header. */
export async function getCaller(req?: Request): Promise<Caller | null> {
  const header = req?.headers.get("authorization") || "";
  const m = header.match(/^(?:Key|Bearer)\s+(swk_[A-Za-z0-9_-]+)$/);
  if (m && dbEnabled()) {
    const userId = await resolveApiKey(hashKey(m[1]));
    if (!userId) return null;
    const profile = await ensureProfile(userId, null, freeCredits());
    const email = profile.email;
    return { userId, email, via: "key", profile, isAdmin: !!email && adminEmails().includes(email.toLowerCase()) };
  }

  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const profile = dbEnabled() ? await ensureProfile(userId, email, freeCredits()) : null;
  return { userId, email, via: "session", profile, isAdmin: !!email && adminEmails().includes(email.toLowerCase()) };
}

export function unauthorized(msg = "Sign in or pass `Authorization: Key <your-api-key>`") {
  return Response.json({ error: msg }, { status: 401 });
}
