"use client";

import { useLayoutEffect, useRef } from "react";

/** Grow a textarea with its content up to `max` px, then scroll inside it. */
export function useAutosize(value: string, max = 260) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(el.scrollHeight, max);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value, max]);
  return ref;
}
