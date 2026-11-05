import { listFalModels } from "@/lib/fal";

export const revalidate = 3600;

// Slim list of fal image/video models for client pickers.
export async function GET() {
  const models = await listFalModels().catch(() => []);
  return Response.json(
    {
      items: models.map((m) => ({ id: m.id, name: m.name, lab: m.lab, kind: m.kind, category: m.category, priceLabel: m.priceLabel, provider: m.provider })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
