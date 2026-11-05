import Link from "next/link";
import { Film, Image as ImageIcon, SquareArrowOutUpRight, Type, Video } from "lucide-react";
import type { Category, Model } from "@/lib/catalog";

const ICON = { text: Type, image: ImageIcon, video: Video } as const;

export function CategoryChip({ category }: { category: Category }) {
  const [from, to] = category.split("-to-") as (keyof typeof ICON)[];
  const From = ICON[from];
  const To = ICON[to];
  const tone =
    from === "text"
      ? "text-[#b4a7f5] border-[#b4a7f5]/25 bg-[#b4a7f5]/5"
      : from === "video"
        ? "text-[#bef264] border-[#bef264]/25 bg-[#bef264]/5"
        : "text-[#93c5fd] border-[#93c5fd]/25 bg-[#93c5fd]/5";
  return (
    <span className={`cat ${tone}`}>
      <From size={13} strokeWidth={1.8} />
      {category}
      <To size={13} strokeWidth={1.8} />
    </span>
  );
}

/** Abstract, photo-like soft blur placeholder (no text). */
export function ModelArt({ model, className = "" }: { model: Model; className?: string }) {
  const [a, b, c] = model.gradient;
  const Icon = model.kind === "video" ? Film : ImageIcon;
  return (
    <div
      className={`grain relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(45% 70% at 25% 35%, ${a}cc 0%, transparent 70%), radial-gradient(55% 80% at 80% 75%, ${b}cc 0%, transparent 70%), radial-gradient(60% 60% at 60% 20%, ${a}66 0%, transparent 70%), ${c}`,
      }}
    >
      <Icon className="absolute bottom-3 right-3 text-white/50" size={16} strokeWidth={1.8} />
    </div>
  );
}

export type Preview = { url: string; kind: "image" | "video" };

/** Real output preview when one exists, otherwise the abstract placeholder. */
export function ModelThumb({ model, preview, className = "" }: { model: Model; preview?: Preview | null; className?: string }) {
  if (!preview) return <ModelArt model={model} className={className} />;
  return (
    <div className={`relative overflow-hidden bg-[#141414] ${className}`}>
      {preview.kind === "video" ? (
        <video src={preview.url} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}

export function ModelName({ id, className = "" }: { id: string; className?: string }) {
  const [lab, ...rest] = id.split("/");
  return (
    <span className={`truncate ${className}`}>
      <span className="text-muted">{lab}/</span>
      <span className="font-semibold text-white">{rest.join("/")}</span>
    </span>
  );
}

export function ModelCard({ model, preview }: { model: Model; preview?: Preview | null }) {
  return (
    <Link href={`/models/${model.id}`} className="card group block overflow-hidden transition hover:border-line-2">
      <div className="relative">
        <ModelThumb model={model} preview={preview} className="aspect-[16/9]" />
        {model.isNew && <span className="absolute left-3 top-3 rounded bg-[#d9f99d] px-1.5 py-0.5 text-xs font-medium text-black">new</span>}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-[17px]">
          <ModelName id={model.id} className="min-w-0 flex-1" />
          <SquareArrowOutUpRight size={14} className="shrink-0 text-dim" />
        </div>
        <p className="line-clamp-2 text-[15px] leading-relaxed text-muted">{model.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {model.tags.slice(0, 3).map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
        <CategoryChip category={model.category} />
      </div>
    </Link>
  );
}

export function ModelRow({ model, preview }: { model: Model; preview?: Preview | null }) {
  return (
    <Link href={`/models/${model.id}`} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-panel-2">
      <ModelThumb model={model} preview={preview} className="h-11 w-11 shrink-0 rounded-md" />
      <div className="min-w-0">
        <ModelName id={model.id} className="block text-[15px]" />
        <div className="truncate text-xs text-dim">{model.description}</div>
      </div>
    </Link>
  );
}
