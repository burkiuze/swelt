import { Explore } from "@/components/Explore";
import { listFalModels } from "@/lib/fal";
import { getPreviews } from "@/lib/showcase";

export const metadata = { title: "Explore models — Vlipa" };
export const revalidate = 60;

export default async function Page() {
  const [previews, fal] = await Promise.all([getPreviews(), listFalModels().catch(() => [])]);
  for (const m of fal) if (m.thumbnail) previews[m.id] ??= { url: m.thumbnail, kind: /\.(mp4|webm|mov)(\?|$)/i.test(m.thumbnail) ? "video" : "image" };
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Explore previews={previews} extra={fal} />
    </div>
  );
}
