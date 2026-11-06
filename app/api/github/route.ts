import { getCaller, unauthorized } from "@/lib/auth";
import { ghConfigured, ghDisconnect, ghInstallUrl, ghSession } from "@/lib/github";

export const dynamic = "force-dynamic";

// GET → { configured, connected, login, installUrl }
export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  const s = ghConfigured() ? await ghSession(caller.userId) : null;
  return Response.json({ configured: ghConfigured(), connected: !!s, login: s?.login ?? null, installUrl: ghInstallUrl() });
}

// DELETE → disconnect
export async function DELETE(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  await ghDisconnect();
  return Response.json({ ok: true });
}
