import { Suspense } from "react";
import { AgentChat } from "@/components/AgentChat";

export const metadata = { title: "Agent — Vlipa" };

export default function Page() {
  return (
    <Suspense>
      <AgentChat />
    </Suspense>
  );
}
