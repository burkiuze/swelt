import Link from "next/link";
import { notFound } from "next/navigation";
import { Playground } from "@/components/Playground";
import { ModelCard } from "@/components/ModelCard";
import { MODELS } from "@/lib/catalog";
import { getAnyModel, listFalModels } from "@/lib/fal";
import { getPreviews } from "@/lib/showcase";

export const revalidate = 60;

export function generateStaticParams() {
  return MODELS.map((m) => ({ id: m.id.split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string[] }> }) {
  const { id } = await params;
  const m = await getAnyModel(id.map(decodeURIComponent).join("/"));
  return { title: m ? `${m.name} — Vlipa` : "Model — Vlipa", description: m?.description };
}

export default async function Page({ params }: { params: Promise<{ id: string[] }> }) {
  const { id } = await params;
  const model = await getAnyModel(id.map(decodeURIComponent).join("/"));
  if (!model) notFound();
  const previews = await getPreviews();
  const pool = model.provider === "fal" ? await listFalModels().catch(() => []) : MODELS;
  for (const m of pool) if (m.thumbnail) previews[m.id] ??= { url: m.thumbnail, kind: /\.(mp4|webm|mov)(\?|$)/i.test(m.thumbnail) ? "video" : "image" };
  if (model.thumbnail) previews[model.id] ??= { url: model.thumbnail, kind: /\.(mp4|webm|mov)(\?|$)/i.test(model.thumbnail) ? "video" : "image" };
  const related = pool.filter((m) => m.id !== model.id && (m.lab === model.lab || m.category === model.category)).slice(0, 3);
  return (
    <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-8 sm:px-7">
      <div className="text-sm text-muted">
        <Link href="/explore" className="hover:text-white">Explore</Link> / {model.lab} / <span className="text-white">{model.name}</span>
      </div>
      <Playground model={model} preview={previews[model.id] ?? null} />
      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Related models</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((m) => (
              <ModelCard key={m.id} model={m} preview={previews[m.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
