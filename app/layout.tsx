import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
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
          colorPrimary: "#ededed",
          colorPrimaryForeground: "#111111",
          colorBackground: "#1c1c1c",
          colorForeground: "#ededed",
          colorInput: "#151515",
          colorInputForeground: "#ededed",
          colorMutedForeground: "#a1a1a1",
          colorNeutral: "#ededed",
          borderRadius: "6px",
        },
      }}
    >
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="min-h-screen">
          <Nav />
          <main>{children}</main>
          <footer className="mx-auto mt-16 flex max-w-[1400px] flex-wrap justify-between gap-4 border-t border-line px-4 py-8 text-sm text-dim sm:px-7">
            <span>© {new Date().getFullYear()} Swelt</span>
            <span className="flex gap-5">
              <a href="/explore" className="hover:text-white">Models</a>
              <a href="/docs" className="hover:text-white">Docs</a>
              <a href="/keys" className="hover:text-white">API keys</a>
            </span>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
