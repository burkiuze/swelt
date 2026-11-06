import { codeCatalog } from "@/lib/codeCatalog";
import { CODE_DEFAULT_MODEL } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const models = await codeCatalog();
  return Response.json({ models, default: models.some((m) => m.id === CODE_DEFAULT_MODEL) ? CODE_DEFAULT_MODEL : models[0]?.id }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
