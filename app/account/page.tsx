import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CircleDollarSign, CircleUserRound, Settings } from "lucide-react";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";
import { ThemeSwitch } from "@/components/AccountMenu";
import { getCaller } from "@/lib/auth";

export const metadata = { title: "Account — Vlipa" };
export const dynamic = "force-dynamic";

function Section({ id, icon: Icon, title, children }: { id: string; icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-28 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Icon size={16} className="text-muted" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const caller = await getCaller();
  if (!caller) redirect("/login?next=/account");
  const session = await auth();
  const user = session?.user;
  const provider = caller.userId.split(":")[0];
  const credits = caller.isAdmin ? "Unlimited" : `$${Number(caller.profile?.credits ?? 0).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      <Section id="account" icon={CircleUserRound} title="Profile">
        <div className="flex items-center gap-4">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#2b6cf6] text-xl font-semibold uppercase text-white">
              {(user?.name || caller.email || "?")[0]}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold">{user?.name || caller.email}</div>
            <div className="truncate text-sm text-muted">{caller.email}</div>
            <div className="mt-1 text-xs capitalize text-dim">Signed in with {provider}</div>
          </div>
          <form action={signOutAction} className="ml-auto">
            <button className="btn">Sign out</button>
          </form>
        </div>
      </Section>

      <Section id="billing" icon={CircleDollarSign} title="Credits">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-2xl font-semibold">{credits}</div>
            <div className="text-xs text-dim">Current balance</div>
          </div>
          <Link href="/usage" className="btn ml-auto">View usage</Link>
        </div>
        <p className="mt-3 text-sm text-muted">Card top-ups are not available yet. To add credits, contact the Vlipa team.</p>
      </Section>

      <Section id="settings" icon={Settings} title="Settings">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <div className="font-medium">Theme</div>
            <div className="text-xs text-dim">Dark, light, or follow your system.</div>
          </div>
          <ThemeSwitch />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <div>
            <div className="font-medium">API keys</div>
            <div className="text-xs text-dim">Call every model from your own code.</div>
          </div>
          <Link href="/keys" className="btn">Manage keys</Link>
        </div>
      </Section>

      <Section id="notifications" icon={Bell} title="Notifications">
        <p className="text-sm text-muted">You&apos;re all caught up. Generation updates and account notices will appear here.</p>
      </Section>
    </div>
  );
}
