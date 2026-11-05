"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  // The agent is a full-height app view.
  const path = usePathname();
  if (path.startsWith("/agent") || path.startsWith("/login")) return null;
  return (
    <footer className="mx-auto mt-12 flex max-w-[1400px] flex-wrap justify-between gap-4 border-t border-line px-4 py-6 text-xs text-dim sm:px-7">
      <span>© {new Date().getFullYear()} Vlipa</span>
      <span className="flex gap-5">
        <a href="/explore" className="hover:text-white">Models</a>
        <a href="/agent" className="hover:text-white">Agent</a>
      </span>
    </footer>
  );
}
