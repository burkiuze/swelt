import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { Dashboard } from "@/components/Dashboard";
import { LatestModels } from "@/components/LatestModels";
import { ModelsFrom } from "@/components/ModelsFrom";
import { PromptBox } from "@/components/PromptBox";


export default async function Home() {
  const signedIn = Boolean((await auth())?.user);
  return (
    <div>
      <section className="aurora px-4 pb-10 pt-14 text-center sm:pt-20">
        <Link
          href="/models/kwaivgi/kling-4.0"
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel/70 py-1 pl-1 pr-3 text-xs text-muted backdrop-blur transition hover:border-accent/50"
        >
          <span className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-2 py-0.5 font-semibold text-white">New</span>
          Kling 4.0 is live on Vlipa <ArrowRight size={12} />
        </Link>
        <h1 className="mx-auto mt-5 max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[64px]">
          Imagine it. <span className="text-gradient">Vlipa makes it.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
          Describe what you want to create. The Vlipa Agent picks the right image and video models and runs every step for you.
        </p>
        <div className="mt-8">
          <PromptBox />
        </div>
        <div className="mt-8">
          <ModelsFrom />
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-[1400px] space-y-14 px-4 sm:px-6">
        {signedIn ? (
          <Dashboard />
        ) : (
          <div className="card relative flex flex-col items-start gap-3 overflow-hidden p-5 sm:flex-row sm:items-center">
            <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex-1">
              <div className="font-semibold">Sign in to start generating</div>
              <div className="text-sm text-muted">Continue with Google. New accounts get free starter credits.</div>
            </div>
            <Link href="/login" className="btn btn-primary relative">Get started</Link>
          </div>
        )}
        <LatestModels />
      </div>
    </div>
  );
}
