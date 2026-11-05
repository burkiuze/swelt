import { getCaller, unauthorized } from "@/lib/auth";
import { getModel, MODELS } from "@/lib/catalog";
import { getGenerationAny, setShowcase } from "@/lib/db";
import { errorResponse, mediaOf, startJob } from "@/lib/jobs";
import { BASE_IMAGE_MODEL, BASE_VIDEO_MODEL, sampleInput, sampleNeeds } from "@/lib/samples";
import { getPreviews } from "@/lib/showcase";

export const dynamic = "force-dynamic";

// Static previews are site-relative; models need absolute URLs.
const abs = (req: Request, u?: string) => (u && u.startsWith("/") ? new URL(u, req.url).toString() : u);

async function admin(req: Request) {
  const c = await getCaller(req);
  return c && c.isAdmin && c.via === "session" ? c : null;
}

// GET: every model with its current preview and whether its sample can run yet.
export async function GET(req: Request) {
  if (!(await admin(req))) return unauthorized("Admins only");
  const previews = await getPreviews();
  const base = { image: abs(req, previews[BASE_IMAGE_MODEL]?.url), video: abs(req, previews[BASE_VIDEO_MODEL]?.url) };
  return Response.json({
    items: MODELS.map((m) => {
      const needs = sampleNeeds(m);
      const blockedBy = needs.image && !base.image ? BASE_IMAGE_MODEL : needs.video && !base.video ? BASE_VIDEO_MODEL : null;
      return { model_id: m.id, name: m.name, kind: m.kind, price: m.price, preview: previews[m.id] ?? null, blockedBy };
    }),
  });
}

// POST { model_id } → start a showcase run (its result replaces the preview when done).
// POST { request_id } → promote one of your finished generations to its model's preview.
export async function POST(req: Request) {
  const caller = await admin(req);
  if (!caller) return unauthorized("Admins only");
  try {
    const body = await req.json();
    if (body.request_id) {
      const g = await getGenerationAny(String(body.request_id));
      const url = g ? mediaOf(g)[0] : null;
      if (!g || !url) return Response.json({ error: "Generation has no media" }, { status: 400 });
      await setShowcase(g.model_id, url, g.kind, typeof g.input?.prompt === "string" ? g.input.prompt : null, false);
      return Response.json({ ok: true });
    }
    const model = getModel(String(body.model_id || ""));
    if (!model) return Response.json({ error: "Unknown model" }, { status: 404 });
    const previews = await getPreviews();
    const input = sampleInput(model, { image: abs(req, previews[BASE_IMAGE_MODEL]?.url), video: abs(req, previews[BASE_VIDEO_MODEL]?.url) });
    return Response.json(await startJob(caller, model.id, input, "showcase"));
  } catch (e) {
    return errorResponse(e);
  }
}
