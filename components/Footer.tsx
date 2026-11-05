"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  // The agent is a full-height app view, like fal's.
  if (usePathname().startsWith("/agent")) return null;
  return (
    <footer className="mx-auto mt-16 flex max-w-[1400px] flex-wrap justify-between gap-4 border-t border-line px-4 py-8 text-sm text-dim sm:px-7">
      <span>© {new Date().getFullYear()} Swelt</span>
      <span className="flex gap-5">
        <a href="/explore" className="hover:text-white">Models</a>
        <a href="/docs" className="hover:text-white">Docs</a>
        <a href="/keys" className="hover:text-white">API keys</a>
      </span>
    </footer>
  );
}
