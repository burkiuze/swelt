import { Explore } from "@/components/Explore";

export const metadata = { title: "Explore models — Swelt" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <Explore />
    </div>
  );
}
