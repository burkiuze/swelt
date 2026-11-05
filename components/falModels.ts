"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/catalog";

export type SlimModel = { id: string; name: string; lab: string; kind: "image" | "video"; category: Category; priceLabel: string; provider: "fal" };

let shared: Promise<SlimModel[]> | null = null;

export function loadFalModels(): Promise<SlimModel[]> {
  shared ??= fetch("/api/models/fal")
    .then((r) => r.json())
    .then((d) => (Array.isArray(d?.items) ? (d.items as SlimModel[]) : []))
    .catch(() => []);
  return shared;
}

/** fal models for pickers (fetched once per page load). */
export function useFalModels(): SlimModel[] {
  const [list, setList] = useState<SlimModel[]>([]);
  useEffect(() => {
    loadFalModels().then(setList);
  }, []);
  return list;
}
