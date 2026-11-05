import type { Caller } from "@/lib/auth";
import { getModel, MODELS } from "@/lib/catalog";
import { errorResponse, pollJob, startJob } from "@/lib/jobs";
import { BASE_IMAGE_MODEL, BASE_VIDEO_MODEL, sampleInput, sampleNeeds } from "@/lib/samples";
import { getPreviews } from "@/lib/showcase";
import { OFFICIAL_PREVIEWS } from "@/lib/officialPreviews";
import { dbEnabled, listShowcase } from "@/lib/db";
import { listHiggsfieldModels, resolveSlug } from "@/lib/higgsfield";

export const dynamic = "force-dynamic";

// Token-authenticated (ADMIN_TOKEN) preview generation, for running the showcase without a browser session.
//   ?token=…&model=<id>      start a showcase run for one model
//   ?token=…&poll=<request>  check a run; on completion the result becomes the model preview
//   ?token=…&status=1        list models and whether they have a generated preview
const SHOWCASE_USER = "system:showcase";
const caller: Caller = { userId: SHOWCASE_USER, email: null, via: "session", profile: null, isAdmin: true };

const abs = (req: Request, u?: string) => (u && u.startsWith("/") ? new URL(u, req.url).toString() : u);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = process.env.ADMIN_TOKEN;
  if (!token || url.searchParams.get("token") !== token) return new Response("forbidden", { status: 403 });
  try {
    const poll = url.searchParams.get("poll");
    if (poll) return Response.json(await pollJob(caller, poll));

    if (url.searchParams.get("higgsfield")) {
      // Which live Higgsfield model each catalog entry resolves to (no generation, no cost).
      const out = await Promise.all(
        MODELS.filter((m) => m.provider === "higgsfield").map(async (m) => {
          try {
            const slug = await resolveSlug(m);
            const item = (await listHiggsfieldModels()).find((x) => x.slug === slug);
            return { model: m.id, slug, item };
          } catch (e) {
            return { model: m.id, error: e instanceof Error ? e.message : String(e) };
          }
        }),
      );
      const all = await listHiggsfieldModels().catch((e) => String(e));
      return Response.json({ resolved: out, available: Array.isArray(all) ? all.map((x) => x.slug) : all });
    }

    if (url.searchParams.get("status")) {
      const generated = new Set(dbEnabled() ? (await listShowcase()).map((r) => r.model_id) : []);
      return Response.json(MODELS.map((m) => ({ model: m.id, generated: generated.has(m.id), official: m.id in OFFICIAL_PREVIEWS, price: m.price })));
    }

    const model = getModel(url.searchParams.get("model") || "");
    if (!model) return Response.json({ error: "Unknown model" }, { status: 404 });
    const previews = await getPreviews();
    const base = { image: abs(req, previews[BASE_IMAGE_MODEL]?.url), video: abs(req, previews[BASE_VIDEO_MODEL]?.url) };
    const needs = sampleNeeds(model);
    if (needs.video && !base.video) return Response.json({ error: `Needs a ${BASE_VIDEO_MODEL} preview first` }, { status: 409 });
    return Response.json(await startJob(caller, model.id, sampleInput(model, base), "showcase"));
  } catch (e) {
    return errorResponse(e);
  }
}
