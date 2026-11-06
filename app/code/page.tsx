import { notFound } from "next/navigation";
import { CodeChat } from "@/components/CodeChat";
import { CODE_ENABLED } from "@/lib/plans";

export const metadata = { title: "Code — Vlipa" };

export default function Page() {
  if (!CODE_ENABLED) notFound();
  return <CodeChat />;
}
