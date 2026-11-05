import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";
import { ModelCard } from "@/components/ModelCard";
import { PromptBox } from "@/components/PromptBox";
import { MODELS } from "@/lib/catalog";

export default function Home() {
  const latest = MODELS.filter((m) => m.isNew).concat(MODELS.filter((m) => !m.isNew)).slice(0, 8);
  return (
    <div>
      <section className="hero-bg grain relative px-4 pb-24 pt-16 text-center sm:pt-24">
        <h1 className="relative text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">Bring your ideas to life.</h1>
        <p className="relative mx-auto mt-4 max-w-xl text-zinc-700">
          Describe in detail what you want to create and the Swelt Agent will pick the right models for the next steps.
        </p>
      </section>
      <div className="relative z-10 -mt-14 px-4">
        <PromptBox />
      </div>

      <div className="mx-auto mt-14 max-w-[1400px] space-y-12 px-4 sm:px-7">
        <Show when="signed-in">
          <Dashboard />
        </Show>
        <Show when="signed-out">
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <h2 className="text-xl font-semibold">Sign in with Google to start generating</h2>
            <p className="max-w-lg text-sm text-muted">New accounts get free starter credits. Run image and video models in the browser, chat with the Agent, or call everything from code with an API key.</p>
            <Link href="/sign-in" className="btn btn-primary">Get started</Link>
          </div>
        </Show>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Latest models</h2>
            <Link href="/explore" className="btn">See all →</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
