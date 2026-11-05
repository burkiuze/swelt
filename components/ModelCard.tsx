import Link from "next/link";
import { Film, Image as ImageIcon, Type, Video } from "lucide-react";
import type { Category, Model } from "@/lib/catalog";

export function CategoryChip({ category }: { category: Category }) {
  const [from, to] = category.split("-to-");
  const Icon = (k: string) => (k === "text" ? Type : k === "image" ? ImageIcon : Video);
  const From = Icon(from);
  const To = Icon(to);
  const color =
    category === "text-to-image" || category === "text-to-video"
      ? "text-violet-300 bg-violet-500/10"
      : category === "video-to-video"
        ? "text-lime-300 bg-lime-500/10"
        : "text-sky-300 bg-sky-500/10";
  return (
    <span className={`chip ${color}`}>
      <From size={12} />
      {category}
      <To size={12} />
    </span>
  );
}

export function ModelArt({ model, className = "" }: { model: Model; className?: string }) {
  const [a, b, c] = model.gradient;
  const Icon = model.kind === "video" ? Film : ImageIcon;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(60% 80% at 20% 25%, ${a} 0%, transparent 70%), radial-gradient(70% 90% at 85% 80%, ${b} 0%, transparent 70%), linear-gradient(135deg, ${c}, ${b})`,
      }}
    >
      <div className="grain absolute inset-0" />
      <Icon className="absolute bottom-3 right-3 text-white/60" size={22} />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pr-10 text-2xl font-semibold tracking-tight text-white/90 drop-shadow">
        {model.name}
      </div>
    </div>
  );
}

export function ModelCard({ model }: { model: Model }) {
  const [lab, ...rest] = model.id.split("/");
  return (
    <Link href={`/models/${model.id}`} className="card group block overflow-hidden transition hover:border-zinc-600">
      <div className="relative">
        <ModelArt model={model} className="aspect-[16/9] transition group-hover:scale-[1.02]" />
        {model.isNew && <span className="chip absolute left-3 top-3 bg-lime-300 font-medium text-black">● new</span>}
      </div>
      <div className="space-y-3 p-4">
        <div className="truncate text-[15px]">
          <span className="text-muted">{lab}/</span>
          <span className="font-semibold">{rest.join("/")}</span>
        </div>
        <p className="line-clamp-2 text-sm text-muted">{model.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {model.tags.slice(0, 3).map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <CategoryChip category={model.category} />
          <span className="text-xs text-dim">{model.priceLabel}</span>
        </div>
      </div>
    </Link>
  );
}

export function ModelRow({ model }: { model: Model }) {
  return (
    <Link href={`/models/${model.id}`} className="card flex overflow-hidden transition hover:border-zinc-600">
      <ModelArt model={{ ...model, name: "" }} className="w-24 shrink-0 sm:w-28" />
      <div className="min-w-0 space-y-2 p-3">
        <div className="truncate text-sm">
          <span className="text-muted">{model.lab}/</span>
          <span className="font-semibold">{model.id.split("/").slice(1).join("/")}</span>
        </div>
        <CategoryChip category={model.category} />
      </div>
    </Link>
  );
}
