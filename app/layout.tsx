import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vlipa — generative media platform",
  description:
    "Create images and videos with the best AI models, or let the Vlipa Agent do it for you. Powered by RunPod, with an AI agent on Claude Opus 5.5 and GPT-6.1 Sol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <head>
          <script
            // Apply the saved theme before first paint (no flash).
            dangerouslySetInnerHTML={{
              __html: `try{var t=localStorage.getItem("vlipa-theme")||"dark";if(t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches))document.documentElement.classList.add("light")}catch(e){}`,
            }}
          />
        </head>
        <body className="min-h-screen">
          <Nav />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
  );
}
