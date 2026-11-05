import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vlipa — generative media platform",
  description:
    "Run the best image and video models in the browser or from code. Powered by RunPod, with an AI agent on Claude Opus 5.5 and GPT-6.1 Sol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="min-h-screen">
          <Nav />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
  );
}
