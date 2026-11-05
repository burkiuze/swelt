import Link from "next/link";
import { auth } from "@/auth";
import { Dashboard } from "@/components/Dashboard";
import { LatestModels } from "@/components/LatestModels";
import { ModelsFrom } from "@/components/ModelsFrom";
import { PromptBox } from "@/components/PromptBox";


export default async function Home() {
  const signedIn = Boolean((await auth())?.user);
  return (
    <div>
      <section className="hero-bg px-4 pb-16 pt-20 text-center sm:pt-28">
        <h1 className="mx-auto max-w-3xl text-[34px] font-semibold leading-tight tracking-[-0.04em] sm:text-[52px]">
          Describe it once. Vlipa handles the rest.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
          Images, videos and full creative workflows from a single prompt — the agent chooses the models for every step.
        </p>
        <div className="mt-10">
          <PromptBox />
        </div>
        <div className="mt-10">
          <ModelsFrom />
        </div>
      </section>

      <div className="mx-auto mt-4 max-w-[1400px] space-y-12 px-4 sm:px-6">
        {signedIn ? (
          <Dashboard />
        ) : (
          <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="font-semibold">Create your free account</div>
              <div className="text-sm text-muted">Sign in with Google, pick a plan and start creating.</div>
            </div>
            <Link href="/login" className="btn btn-primary">Get started</Link>
          </div>
        )}
        <LatestModels />
      </div>
    </div>
  );
}
