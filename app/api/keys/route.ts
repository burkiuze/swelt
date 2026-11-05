import { getCaller, newApiKey, unauthorized } from "@/lib/auth";
import { createApiKey, dbEnabled, listApiKeys, revokeApiKey } from "@/lib/db";
import { errorResponse } from "@/lib/jobs";

export const dynamic = "force-dynamic";

async function sessionCaller(req: Request) {
  const c = await getCaller(req);
  // API keys can't mint or revoke other keys.
  return c && c.via === "session" ? c : null;
}

export async function GET(req: Request) {
  const caller = await sessionCaller(req);
  if (!caller) return unauthorized("Sign in to manage API keys");
  if (!dbEnabled()) return Response.json({ items: [] });
  try {
    return Response.json({ items: await listApiKeys(caller.userId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const caller = await sessionCaller(req);
  if (!caller) return unauthorized("Sign in to manage API keys");
  try {
    const { name } = await req.json().catch(() => ({ name: "" }));
    const k = newApiKey();
    const row = await createApiKey(caller.userId, String(name || "Default key").slice(0, 60), k.prefix, k.hash);
    return Response.json({ id: row.id, key: k.raw, prefix: k.prefix });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  const caller = await sessionCaller(req);
  if (!caller) return unauthorized("Sign in to manage API keys");
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await revokeApiKey(caller.userId, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
