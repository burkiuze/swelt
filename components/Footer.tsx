"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  // The agent is a full-height app view, like fal's.
  const path = usePathname();
  if (path.startsWith("/agent") || path.startsWith("/login")) return null;
  return (
    <footer className="mx-auto mt-12 flex max-w-[1400px] flex-wrap justify-between gap-4 border-t border-line px-4 py-6 text-xs text-dim sm:px-7">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-accent to-accent-2" />© {new Date().getFullYear()} Vlipa · Create anything
      </span>
      <span className="flex gap-5">
        <a href="/explore" className="hover:text-white">Models</a>
        <a href="/docs" className="hover:text-white">Docs</a>
        <a href="/keys" className="hover:text-white">API keys</a>
      </span>
    </footer>
  );
}
