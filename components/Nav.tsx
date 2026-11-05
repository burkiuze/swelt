"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu, CreditsPill, type Me } from "./AccountMenu";
import { Crown, Film, FolderOpen, House, LayoutGrid, Search, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: LayoutGrid },
  { href: "/assets", label: "Assets", icon: FolderOpen },
  { href: "/agent", label: "Generate", icon: Sparkles },
  { href: "/pricing", label: "Pricing", icon: Crown },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path.startsWith(href) || (href === "/explore" && path.startsWith("/models"));
}

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/me")
        .then((r) => r.json())
        .then(setMe)
        .catch(() => {});
    load();
    window.addEventListener("swelt:credits", load);
    return () => window.removeEventListener("swelt:credits", load);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/explore?focus=1");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (path.startsWith("/login")) return null;
  const current = LINKS.find((l) => isActive(path, l.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-tight">
          <Logo size={22} />
          vlipa
        </Link>
        {current && <span className="hidden text-sm text-muted sm:inline">/&nbsp;&nbsp;{current}</span>}
        <span className="flex-1" />
        <Link href="/explore?focus=1" className="hidden h-8 w-56 items-center gap-2 rounded-md border border-line-2 px-2.5 text-[13px] text-muted hover:bg-panel-2 md:flex">
          <Search size={14} />
          <span className="flex-1">Search anything…</span>
          <kbd className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">CTRL K</kbd>
        </Link>
        {me?.signedIn ? (
          <>
            <CreditsPill me={me} />
            <AccountMenu me={me} />
          </>
        ) : me ? (
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-primary">
            Sign in
          </Link>
        ) : null}
      </div>
      <nav className="scrollbar-none mx-auto flex max-w-[1400px] gap-0.5 overflow-x-auto px-2 sm:px-4">
        {[...LINKS, ...(me?.unlimited ? [{ href: "/previews", label: "Previews", icon: Film }] : [])].map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex shrink-0 items-center gap-1.5 px-2.5 pb-2 pt-0.5 text-sm font-medium transition ${
                active ? "text-white" : "text-muted hover:text-white"
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
              {active && <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-white" />}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

