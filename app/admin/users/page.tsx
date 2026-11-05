import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/UsersAdmin";
import { getCaller } from "@/lib/auth";

export const metadata = { title: "Users — Vlipa" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const caller = await getCaller();
  if (!caller) redirect("/login?next=/admin/users");
  if (!caller.isAdmin) redirect("/account");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <UsersAdmin />
    </div>
  );
}
