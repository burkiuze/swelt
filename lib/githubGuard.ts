import { getCaller } from "./auth";
import { ghSession, type GhSession } from "./github";
import { getCodeAccess } from "./planServer";

/** Signed-in Code member with a connected GitHub account, or an error Response. */
export async function ghGuard(req: Request): Promise<{ s: GhSession; userId: string } | Response> {
  const caller = await getCaller(req);
  if (!caller || caller.via !== "session") return Response.json({ error: "Sign in to continue" }, { status: 401 });
  const access = await getCodeAccess(caller.userId, caller.isAdmin);
  if (!access.active) return Response.json({ error: "The Code membership is required." }, { status: 403 });
  const s = await ghSession(caller.userId);
  if (!s) return Response.json({ error: "Connect your GitHub account first." }, { status: 401 });
  return { s, userId: caller.userId };
}

export const ghError = (e: unknown) => {
  const status = (e as { status?: number }).status;
  const msg = e instanceof Error ? e.message : String(e);
  return Response.json({ error: `GitHub: ${msg}` }, { status: status === 404 || status === 403 || status === 409 || status === 422 ? status : 502 });
};
