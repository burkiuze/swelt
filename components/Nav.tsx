"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { BookOpen, Coins, Compass, FolderOpen, House, KeyRound, Search, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/assets", label: "Assets", icon: FolderOpen },
  { href: "/agent", label: "Generate", icon: Sparkles },
  { href: "/keys", label: "API Keys", icon: KeyRound },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Nav() {
  const path = usePathname();
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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-7">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span className="hidden text-lg sm:inline">swelt</span>
        </Link>
        <nav className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? path === "/" : path.startsWith(href) || (href === "/explore" && path.startsWith("/models"));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ${
                  active ? "bg-panel-2 text-white" : "text-muted hover:text-white"
                }`}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <Link href="/explore" className="btn hidden text-muted lg:inline-flex">
          <Search size={14} /> Search models
        </Link>
        <Show when="signed-in">
          {me?.signedIn && (
            <Link href="/usage" className="btn shrink-0" title="Credits balance">
              <Coins size={14} className="text-accent-2" />
              {me.unlimited ? "Unlimited" : `$${(me.credits ?? 0).toFixed(2)}`}
            </Link>
          )}
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="btn btn-primary shrink-0">Sign in</button>
          </SignInButton>
        </Show>
      </div>
    </header>
  );
}
