import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, enabledProviders } from "@/auth";
import { signInWith } from "@/app/actions";

export const metadata = { title: "Sign in — Vlipa" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "This email is already linked to another sign-in method.",
  AccessDenied: "Access was denied.",
  Configuration: "Sign-in is not configured yet.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23 12.25c0-.8-.07-1.56-.2-2.3H12v4.35h6.17a5.3 5.3 0 0 1-2.3 3.47v2.88h3.72C21.76 18.65 23 15.7 23 12.25Z" />
      <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1.03 7.6-2.79l-3.72-2.88c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.72H1.75v2.97A11.5 11.5 0 0 0 12 23.5Z" />
      <path fill="#FBBC05" d="M5.6 14.21A6.9 6.9 0 0 1 5.24 12c0-.77.13-1.52.36-2.21V6.82H1.75a11.5 11.5 0 0 0 0 10.36l3.85-2.97Z" />
      <path fill="#EA4335" d="M12 5.07c1.69 0 3.2.58 4.39 1.72l3.3-3.3A11.06 11.06 0 0 0 12 .5 11.5 11.5 0 0 0 1.75 6.82L5.6 9.79C6.5 7.08 9.02 5.07 12 5.07Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  if ((await auth())?.user) redirect(next.startsWith("/") ? next : "/");
  const p = enabledProviders();
  const none = !p.google && !p.github;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      {/* Full-bleed background art (public/login-bg.jpg); falls back to a soft gradient */}
      <div className="hero-bg absolute inset-0" />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/login-bg.jpg)" }} />
      <div className="absolute inset-0 bg-black/35" />
      <div className="grain pointer-events-none absolute inset-0" />

      <Link href="/" className="absolute left-5 top-5 z-10 flex items-center gap-2 text-lg font-bold text-white drop-shadow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/swelt-white.png" alt="" className="h-6 w-6" />
        vlipa
      </Link>
      <nav className="absolute right-5 top-6 z-10 hidden gap-5 text-sm text-white/80 sm:flex">
        <Link href="/explore" className="hover:text-white">Models</Link>
        <Link href="/docs" className="hover:text-white">Docs</Link>
      </nav>

      <div className="relative z-10 w-full max-w-[380px] rounded-2xl border border-white/10 bg-panel/80 p-7 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/swelt-white.png" alt="" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome to Vlipa</h1>
          <p className="mt-1 text-sm text-muted">Sign in or create your account</p>
        </div>

        {error && <div className="mt-5 rounded-lg border border-[#e5484d]/30 bg-[#e5484d]/10 px-3 py-2 text-center text-xs text-[#ff9592]">{ERRORS[error] ?? "Sign-in failed. Please try again."}</div>}

        <div className="mt-6 space-y-2.5">
          <form action={signInWith.bind(null, "google", next)}>
            <button disabled={!p.google} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-white text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">
              <GoogleIcon /> Continue with Google
            </button>
          </form>
          <form action={signInWith.bind(null, "github", next)}>
            <button disabled={!p.github} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              <GitHubIcon /> Continue with GitHub
            </button>
          </form>
        </div>

        {none && <p className="mt-4 text-center text-xs text-[#facc15]">Sign-in providers are not configured yet.</p>}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-dim">
          By continuing you agree to Vlipa&apos;s Terms and Privacy Policy. New accounts get free starter credits.
        </p>
      </div>
    </div>
  );
}
