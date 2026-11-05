import { Explore } from "@/components/Explore";
import { getPreviews } from "@/lib/showcase";

export const metadata = { title: "Explore models — Swelt" };
export const revalidate = 60;

export default async function Page() {
  const previews = await getPreviews();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <Explore previews={previews} />
    </div>
  );
}
