"use client";

import Link from "next/link";
import { FolderOpen, History, LayoutGrid, PanelLeft, Plus, Settings } from "lucide-react";

const ITEMS = [
  { href: "/agent", icon: Plus, label: "New generation", reload: true },
  { href: "/assets", icon: FolderOpen, label: "Assets" },
  { href: "/explore", icon: LayoutGrid, label: "Models" },
];

/** Icon rail on the left of the agent. */
export function AgentRail({ onTogglePanel, onHistory }: { onTogglePanel?: () => void; onHistory?: () => void }) {
  const cls = "group relative flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-panel-2 hover:text-white";
  const tip = "pointer-events-none absolute left-11 z-50 whitespace-nowrap rounded-md bg-[#2a2a2a] px-2 py-1 text-xs text-white opacity-0 shadow transition group-hover:opacity-100";
  return (
    <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-line py-2 md:flex">
      <button onClick={onTogglePanel} className={cls} aria-label="Toggle media panel">
        <PanelLeft size={18} strokeWidth={1.7} />
        <span className={tip}>Toggle media panel</span>
      </button>
      <div className="my-2 h-px w-8 bg-line" />
      <nav className="flex flex-col items-center gap-1">
        <button onClick={onHistory} className={cls} aria-label="Chat history">
          <History size={18} strokeWidth={1.7} />
          <span className={tip}>Chat history</span>
        </button>
        {ITEMS.map(({ href, icon: Icon, label, reload }) =>
          reload ? (
            <a key={label} href={href} className={cls} aria-label={label}>
              <Icon size={18} strokeWidth={1.7} />
              <span className={tip}>{label}</span>
            </a>
          ) : (
            <Link key={label} href={href} className={cls} aria-label={label}>
              <Icon size={18} strokeWidth={1.7} />
              <span className={tip}>{label}</span>
            </Link>
          ),
        )}
      </nav>
      <span className="flex-1" />
      <Link href="/account#settings" className={cls} aria-label="Settings">
        <Settings size={18} strokeWidth={1.7} />
        <span className={tip}>Settings</span>
      </Link>
    </aside>
  );
}
