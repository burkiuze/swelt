// Admin diagnostics: fetch provider docs/APIs from the server (adds the RunPod key for RunPod API hosts).
export const dynamic = "force-dynamic";

const ALLOWED = ["api.runpod.ai", "rest.runpod.io", "api.runpod.io", "docs.runpod.io", "www.runpod.io", "runpod.io", "console.runpod.io", "openrouter.ai"];

export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || (req.headers.get("x-admin-token") || new URL(req.url).searchParams.get("token")) !== token) return new Response("forbidden", { status: 403 });
  const target = new URL(new URL(req.url).searchParams.get("url") || "");
  if (!ALLOWED.includes(target.hostname)) return new Response("host not allowed", { status: 400 });
  const headers: Record<string, string> = { "User-Agent": "swelt-admin" };
  if (/^(api\.runpod\.ai|rest\.runpod\.io|api\.runpod\.io)$/.test(target.hostname)) headers.Authorization = `Bearer ${process.env.RUNPOD_API_KEY}`;
  if (target.hostname === "openrouter.ai" && target.pathname.startsWith("/api/v1/key")) headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
  const res = await fetch(target, { headers, cache: "no-store" });
  const text = await res.text();
  return new Response(text.slice(0, 400_000), { status: res.status, headers: { "content-type": res.headers.get("content-type") || "text/plain" } });
}
