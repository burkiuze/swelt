import { gh, validBranch, validRepo } from "@/lib/github";
import { ghError, ghGuard } from "@/lib/githubGuard";

export const dynamic = "force-dynamic";

// GET ?repo=owner/name&ref=branch → { branches, paths } (text-like files only, max 3000)
export async function GET(req: Request) {
  const g = await ghGuard(req);
  if (g instanceof Response) return g;
  const u = new URL(req.url);
  const repo = u.searchParams.get("repo");
  const ref = u.searchParams.get("ref");
  if (!validRepo(repo) || !validBranch(ref)) return Response.json({ error: "Bad repo or branch" }, { status: 400 });
  try {
    const [branches, tree] = await Promise.all([
      gh<{ name: string }[]>(g.s, `/repos/${repo}/branches?per_page=100`),
      gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(g.s, `/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`).catch(() => ({ tree: [], truncated: false })),
    ]);
    const paths = tree.tree
      .filter((t) => t.type === "blob" && (t.size ?? 0) < 400_000 && !/(^|\/)(node_modules|dist|build|\.next|vendor)\//.test(t.path) && !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|mp[34]|wav|woff2?|ttf|lock)$/i.test(t.path))
      .map((t) => t.path)
      .slice(0, 3000);
    return Response.json({ branches: branches.map((b) => b.name), paths, truncated: tree.truncated });
  } catch (e) {
    return ghError(e);
  }
}
