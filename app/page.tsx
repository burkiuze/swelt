import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";
import { LatestModels } from "@/components/LatestModels";
import { PromptBox } from "@/components/PromptBox";

export const revalidate = 60;

export default function Home() {
  return (
    <div>
      <section className="hero-bg grain px-4 pb-28 pt-16 text-center sm:pt-24">
        <h1 className="relative text-5xl font-bold tracking-[-0.045em] text-[#1a1a1a] sm:text-[68px]">Bring your ideas to life.</h1>
        <p className="relative mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-[#4a4a4a]">
          Describe in detail what you want to create and the Swelt Agent will bring the right models for the next steps.
        </p>
      </section>
      <div className="relative z-10 -mt-[72px] px-4 sm:px-7">
        <PromptBox />
      </div>

      <div className="mx-auto mt-16 max-w-[1400px] space-y-14 px-4 sm:px-7">
        <Show when="signed-in">
          <Dashboard />
        </Show>
        <Show when="signed-out">
          <div className="card flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="text-lg font-semibold">Sign in to start generating</div>
              <div className="text-muted">Continue with Google. New accounts get free starter credits.</div>
            </div>
            <Link href="/sign-in" className="btn btn-primary">Get started</Link>
          </div>
        </Show>
        <LatestModels />
      </div>
    </div>
  );
}
