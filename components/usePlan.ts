"use client";

import { useEffect, useState } from "react";
import type { PlanKey } from "@/lib/plans";

let shared: Promise<PlanKey> | null = null;

/** The signed-in user's plan (fetched once per page load). */
export function usePlan(): PlanKey | null {
  const [plan, setPlan] = useState<PlanKey | null>(null);
  useEffect(() => {
    shared ??= fetch("/api/me")
      .then((r) => r.json())
      .then((d) => (d?.plan as PlanKey) || "free")
      .catch(() => "free" as PlanKey);
    shared.then(setPlan);
  }, []);
  return plan;
}
