import { Suspense } from "react";
import { Assets } from "@/components/Assets";

export const metadata = { title: "Assets — Vlipa" };

export default function Page() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <Suspense>
        <Assets />
      </Suspense>
    </div>
  );
}
