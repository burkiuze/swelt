import { getCaller } from "@/lib/auth";
import { newCode, normalizeCode } from "@/lib/codes";
import { createCodes, dbEnabled, deleteCode, listCodes } from "@/lib/db";
import { errorResponse } from "@/lib/jobs";

export const dynamic = "force-dynamic";

async function admin(req: Request) {
  const c = await getCaller(req);
  return c && c.via === "session" && c.isAdmin ? c : null;
}

const forbidden = () => Response.json({ error: "Admins only" }, { status: 403 });

export async function GET(req: Request) {
  if (!(await admin(req))) return forbidden();
  if (!dbEnabled()) return Response.json({ items: [] });
  try {
    return Response.json({ items: await listCodes(500) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  if (!(await admin(req))) return forbidden();
  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.floor(Number(body.count));
    const credits = Math.round(Number(body.credits) * 100) / 100;
    const note = String(body.note || "").slice(0, 80);
    if (!(count >= 1 && count <= 200)) return Response.json({ error: "Count must be 1–200" }, { status: 400 });
    if (!(credits > 0 && credits <= 10_000)) return Response.json({ error: "Credits must be between 0 and 10,000" }, { status: 400 });
    const codes = Array.from(new Set(Array.from({ length: count }, newCode)));
    await createCodes(codes, credits, note || null);
    return Response.json({ codes, credits, note });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  if (!(await admin(req))) return forbidden();
  try {
    const { code } = await req.json().catch(() => ({ code: "" }));
    const ok = await deleteCode(normalizeCode(String(code || "")));
    return Response.json({ ok });
  } catch (e) {
    return errorResponse(e);
  }
}
