import { getCaller, unauthorized } from "@/lib/auth";
import { dbEnabled, listGenerations } from "@/lib/db";
import { errorResponse, view } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller) return unauthorized();
  if (!dbEnabled()) return Response.json({ items: [] });
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    const limit = Number(url.searchParams.get("limit") || 60);
    const rows = await listGenerations(caller.userId, limit, kind === "image" || kind === "video" ? kind : null);
    return Response.json({ items: rows.map((g) => view(g)) });
  } catch (e) {
    return errorResponse(e);
  }
}
