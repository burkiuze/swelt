import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";
import { LatestModels } from "@/components/LatestModels";
import { ModelsFrom } from "@/components/ModelsFrom";
import { PromptBox } from "@/components/PromptBox";

export const revalidate = 60;

export default function Home() {
  return (
    <div>
      <section className="hero-bg grain px-4 pb-24 pt-14 text-center sm:pt-20">
        <h1 className="relative text-4xl font-bold tracking-[-0.045em] text-[#1a1a1a] sm:text-[54px]">Bring your ideas to life.</h1>
        <p className="relative mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#4a4a4a]">
          Describe in detail what you want to create and the Vlipa Agent will bring the right models for the next steps.
        </p>
      </section>
      <div className="relative z-10 -mt-[60px] px-4 sm:px-6">
        <PromptBox />
        <div className="mt-6">
          <ModelsFrom />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1400px] space-y-12 px-4 sm:px-6">
        <Show when="signed-in">
          <Dashboard />
        </Show>
        <Show when="signed-out">
          <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="font-semibold">Sign in to start generating</div>
              <div className="text-sm text-muted">Continue with Google. New accounts get free starter credits.</div>
            </div>
            <Link href="/sign-in" className="btn btn-primary">Get started</Link>
          </div>
        </Show>
        <LatestModels />
      </div>
    </div>
  );
}
