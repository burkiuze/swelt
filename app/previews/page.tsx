import { redirect } from "next/navigation";
import { PreviewsAdmin } from "@/components/PreviewsAdmin";
import { getCaller } from "@/lib/auth";

export const metadata = { title: "Model previews — Vlipa" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const caller = await getCaller();
  if (!caller) redirect("/sign-in");
  if (!caller.isAdmin) redirect("/explore");
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <PreviewsAdmin />
    </div>
  );
}
