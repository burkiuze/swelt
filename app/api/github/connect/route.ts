import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCaller } from "@/lib/auth";
import { GH_STATE, ghConfigured } from "@/lib/github";

export const dynamic = "force-dynamic";

// GET → redirect to GitHub to authorize the Vlipa Code app.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const caller = await getCaller(req);
  if (!caller) return Response.redirect(`${origin}/login?next=/code`, 302);
  if (!ghConfigured()) return Response.redirect(`${origin}/code?github=unavailable`, 302);
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(GH_STATE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", process.env.GITHUB_APP_CLIENT_ID!);
  u.searchParams.set("redirect_uri", `${origin}/api/github/callback`);
  u.searchParams.set("state", state);
  return Response.redirect(u.toString(), 302);
}
