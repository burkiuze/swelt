import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MODELS } from "@/lib/catalog";
import { getPreviews } from "@/lib/showcase";
import { CategoryChip, ModelName, ModelThumb } from "./ModelCard";

export async function LatestModels() {
  const previews = await getPreviews();
  const latest = MODELS.filter((m) => m.isNew).concat(MODELS.filter((m) => !m.isNew)).slice(0, 8);
  return (
    <section>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 rounded-md bg-panel-2 px-3 py-1.5 text-sm font-semibold">
          <Sparkles size={14} /> Latest models
        </span>
        <Link href="/explore" className="btn">
          See all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {latest.map((m) => (
          <Link key={m.id} href={`/models/${m.id}`} className="card flex overflow-hidden transition hover:border-line-2">
            <ModelThumb model={m} preview={previews[m.id]} className="w-20 shrink-0" />
            <div className="min-w-0 space-y-2 p-3">
              <ModelName id={m.id} className="block text-sm" />
              <div className="flex items-center gap-2">
                <CategoryChip category={m.category} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
