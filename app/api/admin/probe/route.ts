import { MODELS } from "@/lib/catalog";
import { candidateEndpoints, health } from "@/lib/runpod";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Admin: check which candidate endpoint IDs exist on RunPod.
export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || (req.headers.get("x-admin-token") || new URL(req.url).searchParams.get("token")) !== token) return new Response("forbidden", { status: 403 });
  const out = await Promise.all(
    MODELS.map(async (m) => ({
      model: m.id,
      endpoints: await Promise.all(candidateEndpoints(m).map(async (e) => ({ e, ...(await health(e).catch((err) => ({ status: 0, body: String(err) }))) }))),
    })),
  );
  return Response.json(out);
}
