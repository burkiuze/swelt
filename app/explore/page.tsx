import { Explore } from "@/components/Explore";
import { getPreviews } from "@/lib/showcase";

export const metadata = { title: "Explore models — Vlipa" };
export const revalidate = 60;

export default async function Page() {
  const previews = await getPreviews();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="eyebrow">Explore</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Every model, <span className="text-gradient">one place.</span></h1>
      </div>
      <Explore previews={previews} />
    </div>
  );
}
