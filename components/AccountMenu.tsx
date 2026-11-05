"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, CircleDollarSign, CircleUserRound, KeyRound, LogOut, Moon, Settings, SunMedium, SunMoon, Ticket, Coins } from "lucide-react";
import { signOutAction } from "@/app/actions";

export type Me = {
  signedIn: boolean;
  credits: number | null;
  unlimited?: boolean;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const money = (me: Me) => (me.unlimited ? "Unlimited" : `$${(me.credits ?? 0).toFixed(2)}`);
const low = (me: Me) => !me.unlimited && (me.credits ?? 0) <= 0;

export function CreditsPill({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[34px] items-center gap-2 rounded-full border border-line-2 bg-panel/60 pl-1 pr-2.5 text-[13px] transition hover:border-accent/50 ${open ? "border-accent/50" : ""}`}
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${low(me) ? "bg-[#e5484d]/15 text-[#ff9592]" : "bg-gradient-to-br from-accent to-accent-2 text-white"}`}>
          <Coins size={13} strokeWidth={2} />
        </span>
        <span className="hidden text-muted sm:inline">Credits</span>
        <span className={`font-semibold ${low(me) ? "text-[#ff9592]" : "text-white"}`}>{money(me)}</span>
        <ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-line-2 bg-panel text-sm shadow-2xl shadow-black/50">
          <div className="relative overflow-hidden bg-gradient-to-br from-accent/25 via-accent-2/10 to-transparent p-4">
            <div className="eyebrow">Balance</div>
            <div className={`mt-1 text-3xl font-semibold tracking-tight ${low(me) ? "text-[#ff9592]" : ""}`}>{money(me)}</div>
            <p className="mt-1 text-xs text-muted">Each run is charged at the provider&apos;s price.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <Link href="/usage" onClick={() => setOpen(false)} className="btn justify-center">Usage</Link>
            <Link href="/account#billing" onClick={() => setOpen(false)} className="btn btn-primary justify-center">Redeem code</Link>
          </div>
        </div>
      )}
    </div>
  );
}

type Theme = "dark" | "light" | "system";

export function applyTheme(t: Theme) {
  const light = t === "light" || (t === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("light", light);
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      setTheme((localStorage.getItem("vlipa-theme") as Theme) || "dark");
    } catch {}
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("vlipa-theme", t);
    } catch {}
    applyTheme(t);
  };
  return [theme, set];
}

export function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  const opts: { v: Theme; icon: typeof Moon; label: string }[] = [
    { v: "dark", icon: Moon, label: "Dark" },
    { v: "light", icon: SunMedium, label: "Light" },
    { v: "system", icon: SunMoon, label: "System" },
  ];
  return (
    <span className="flex rounded-full border border-line-2 p-0.5">
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          title={label}
          onClick={(e) => {
            e.stopPropagation();
            setTheme(v);
          }}
          className={`flex h-6 w-7 items-center justify-center rounded-full ${theme === v ? "bg-accent text-white" : "text-muted hover:text-white"}`}
        >
          <Icon size={13} />
        </button>
      ))}
    </span>
  );
}

export function Avatar({ me, size = 32 }: { me: Me; size?: number }) {
  const letter = (me.name || me.email || "?")[0];
  return me.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={me.image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="shrink-0 rounded-full ring-1 ring-line-2 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-semibold uppercase text-white" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {letter}
    </span>
  );
}

export function AccountMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const item = "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-hover";
  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="block" aria-label="Account menu">
        <Avatar me={me} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-line-2 bg-panel text-sm shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 border-b border-line bg-gradient-to-br from-accent/20 via-accent-2/5 to-transparent p-3.5">
            <Avatar me={me} size={40} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{me.name || me.email?.split("@")[0]}</div>
              <div className="truncate text-xs text-muted">{me.email}</div>
            </div>
          </div>
          <div className="border-b border-line p-1">
            <Link href="/account" onClick={close} className={item}>
              <CircleUserRound size={16} className="text-muted" /> Account
            </Link>
            <Link href="/account#settings" onClick={close} className={item}>
              <Settings size={16} className="text-muted" /> Settings
            </Link>
            <Link href="/keys" onClick={close} className={item}>
              <KeyRound size={16} className="text-muted" /> API Keys
            </Link>
            <Link href="/usage" onClick={close} className={item}>
              <CircleDollarSign size={16} className="text-muted" /> Credits
              <span className={`ml-auto rounded border border-line-2 px-1.5 py-0.5 text-xs ${low(me) ? "text-[#ff9592]" : "text-muted"}`}>{money(me)}</span>
            </Link>
            <Link href="/account#notifications" onClick={close} className={item}>
              <Bell size={16} className="text-muted" /> Notifications
            </Link>
            {me.unlimited && (
              <Link href="/admin/codes" onClick={close} className={item}>
                <Ticket size={16} className="text-muted" /> Redeem codes
                <span className="ml-auto text-xs text-dim">Admin</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
            <SunMoon size={16} className="text-muted" /> Theme
            <span className="ml-auto">
              <ThemeSwitch />
            </span>
          </div>
          <form action={signOutAction} className="p-1">
            <button className={item}>
              <LogOut size={16} className="text-muted" /> Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
