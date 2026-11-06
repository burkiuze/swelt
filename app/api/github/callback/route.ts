import { cookies } from "next/headers";
import { getCaller } from "@/lib/auth";
import { GH_STATE, ghConnect } from "@/lib/github";

export const dynamic = "force-dynamic";

// GitHub redirects here after authorization (and after installing the app, if "request user
// authorization during installation" is on).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const caller = await getCaller(req);
  if (!caller) return Response.redirect(`${origin}/login?next=/code`, 302);
  const jar = await cookies();
  const state = url.searchParams.get("state");
  const expected = jar.get(GH_STATE)?.value;
  jar.delete(GH_STATE);
  const code = url.searchParams.get("code");
  // Installation-initiated authorizations come without our state; accept them only together with an installation id.
  const fromInstall = !state && url.searchParams.get("installation_id");
  if (!code || (!fromInstall && (!state || state !== expected))) return Response.redirect(`${origin}/code?github=error`, 302);
  try {
    await ghConnect(code, caller.userId);
  } catch {
    return Response.redirect(`${origin}/code?github=error`, 302);
  }
  return Response.redirect(`${origin}/code?github=connected`, 302);
}
