import { gh, validBranch, validPath, validRepo } from "@/lib/github";
import { ghError, ghGuard } from "@/lib/githubGuard";

export const dynamic = "force-dynamic";

// GET ?repo=&ref=&path= → { path, content } (UTF-8, max ~100 KB)
export async function GET(req: Request) {
  const g = await ghGuard(req);
  if (g instanceof Response) return g;
  const u = new URL(req.url);
  const repo = u.searchParams.get("repo");
  const ref = u.searchParams.get("ref");
  const path = u.searchParams.get("path");
  if (!validRepo(repo) || !validBranch(ref) || !validPath(path)) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const f = await gh<{ content?: string; encoding?: string; size?: number }>(g.s, `/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
    if (!f.content || f.encoding !== "base64") return Response.json({ error: "Not a text file" }, { status: 415 });
    const content = Buffer.from(f.content, "base64").toString("utf8");
    if (content.includes("\u0000")) return Response.json({ error: "Binary files can't be attached" }, { status: 415 });
    return Response.json({ path, content: content.slice(0, 100_000), truncated: content.length > 100_000 });
  } catch (e) {
    return ghError(e);
  }
}
