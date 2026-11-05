import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swelt — generative media platform",
  description:
    "Run the best image and video models in the browser or from code. Powered by RunPod, with an AI agent on Claude Opus 5.5 and GPT-6.1 Sol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#18181b",
          colorForeground: "#f4f4f5",
          colorInput: "#141417",
          colorInputForeground: "#f4f4f5",
          colorMutedForeground: "#a1a1aa",
          colorNeutral: "#f4f4f5",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen">
          <Nav />
          <main>{children}</main>
          <footer className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-4 px-4 py-10 text-xs text-dim sm:px-7">
            <span>© {new Date().getFullYear()} Swelt · Models served by RunPod · Agent via OpenRouter</span>
            <span className="flex gap-4">
              <a href="/explore" className="hover:text-white">Models</a>
              <a href="/docs" className="hover:text-white">API docs</a>
              <a href="/keys" className="hover:text-white">API keys</a>
            </span>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
