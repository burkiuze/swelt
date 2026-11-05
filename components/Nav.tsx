"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { BookOpen, FolderOpen, House, KeyRound, LayoutGrid, Search, Sparkles } from "lucide-react";
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
  const [me, setMe] = useState<{ signedIn: boolean; credits: number | null; unlimited?: boolean } | null>(null);

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

  const current = LINKS.find((l) => isActive(path, l.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-[22px] font-bold tracking-tight">
          <Logo />
          swelt
        </Link>
        {current && <span className="hidden text-muted sm:inline">/&nbsp;&nbsp;{current}</span>}
        <span className="flex-1" />
        <Link href="/explore?focus=1" className="hidden h-9 w-64 items-center gap-2 rounded-md border border-line-2 px-3 text-sm text-muted hover:bg-panel-2 md:flex">
          <Search size={15} />
          <span className="flex-1">Search anything…</span>
          <kbd className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">CTRL K</kbd>
        </Link>
        <Show when="signed-in">
          {me?.signedIn && (
            <Link href="/usage" className="btn">
              <span className="text-muted">Credits:</span>
              {me.unlimited ? "Unlimited" : `$${(me.credits ?? 0).toFixed(2)}`}
            </Link>
          )}
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="btn btn-primary">Sign in</button>
          </SignInButton>
        </Show>
      </div>
      <nav className="scrollbar-none mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-2 sm:px-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex shrink-0 items-center gap-1.5 px-2.5 pb-2.5 pt-1 text-[15px] font-medium transition ${
                active ? "text-white" : "text-muted hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
              {active && <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-white" />}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
