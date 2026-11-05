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
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Sparkles size={12} /> Fresh drops</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Latest models</h2>
        </div>
        <Link href="/explore" className="btn">
          See all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {latest.map((m) => (
          <Link key={m.id} href={`/models/${m.id}`} className="card lift flex items-center gap-1 overflow-hidden p-1.5">
            <ModelThumb model={m} preview={previews[m.id]} className="h-16 w-16 shrink-0 rounded-[11px]" />
            <div className="min-w-0 space-y-1.5 px-2.5">
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
