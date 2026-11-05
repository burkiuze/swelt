import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MODELS } from "@/lib/catalog";
import { CategoryChip, ModelArt, ModelName } from "./ModelCard";

export function LatestModels() {
  const latest = MODELS.filter((m) => m.isNew).concat(MODELS.filter((m) => !m.isNew)).slice(0, 8);
  return (
    <section>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 rounded-md bg-panel-2 px-4 py-2.5 text-[15px] font-semibold">
          <Sparkles size={16} /> Latest models
        </span>
        <Link href="/explore" className="btn">
          See all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {latest.map((m) => (
          <Link key={m.id} href={`/models/${m.id}`} className="card flex overflow-hidden transition hover:border-line-2">
            <ModelArt model={m} className="w-28 shrink-0" />
            <div className="min-w-0 space-y-2.5 p-3.5">
              <ModelName id={m.id} className="block text-[15px]" />
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
