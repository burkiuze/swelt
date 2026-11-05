"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu, CreditsPill, type Me } from "./AccountMenu";
import { BookOpen, Film, FolderOpen, House, KeyRound, LayoutGrid, Search, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: LayoutGrid },
  { href: "/assets", label: "Assets", icon: FolderOpen },
  { href: "/agent", label: "Generate", icon: Sparkles },
  { href: "/keys", label: "API Keys", icon: KeyRound },
  { href: "/docs", label: "Docs", icon: BookOpen },
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
  const links = [...LINKS, ...(me?.unlimited ? [{ href: "/previews", label: "Previews", icon: Film }] : [])];

  const tabs = (mobile: boolean) =>
    links.map(({ href, label, icon: Icon }) => {
      const active = isActive(path, href);
      return (
        <Link
          key={href}
          href={href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
            active ? "bg-panel-2 text-white shadow-[inset_0_0_0_1px_var(--color-line-2)]" : "text-muted hover:text-white"
          } ${mobile ? "" : ""}`}
        >
          <Icon size={14} strokeWidth={1.9} className={active ? "text-accent" : ""} />
          {label}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[17px] font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_18px_-6px_var(--color-accent)]">
            <Logo size={18} keepWhite />
          </span>
          vlipa
        </Link>

        <nav className="mx-auto hidden items-center gap-0.5 rounded-full border border-line bg-panel/60 p-1 lg:flex">{tabs(false)}</nav>
        <span className="flex-1 lg:hidden" />

        <Link
          href="/explore?focus=1"
          aria-label="Search"
          className="hidden h-[34px] items-center gap-2 rounded-full border border-line-2 bg-panel/60 pl-3 pr-1.5 text-[13px] text-muted transition hover:border-accent/50 md:flex"
        >
          <Search size={14} />
          <span className="pr-6">Search</span>
          <kbd className="rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-dim">⌘K</kbd>
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
      <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">{tabs(true)}</nav>
    </header>
  );
}
