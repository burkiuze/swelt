import { redirect } from "next/navigation";
import { CodesAdmin } from "@/components/CodesAdmin";
import { getCaller } from "@/lib/auth";

export const metadata = { title: "Redeem codes — Vlipa" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const caller = await getCaller();
  if (!caller) redirect("/login?next=/admin/codes");
  if (!caller.isAdmin) redirect("/account");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <CodesAdmin />
    </div>
  );
}
