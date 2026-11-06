import { ghCommit, validBranch, validPath, validRepo } from "@/lib/github";
import { ghError, ghGuard } from "@/lib/githubGuard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { repo, branch, base?, message, files: [{ path, content | null(delete) }] } → { sha, url }
export async function POST(req: Request) {
  const g = await ghGuard(req);
  if (g instanceof Response) return g;
  const b = await req.json().catch(() => ({}));
  const files = Array.isArray(b.files) ? b.files : [];
  if (!validRepo(b.repo) || !validBranch(b.branch) || (b.base != null && !validBranch(b.base))) return Response.json({ error: "Bad repo or branch" }, { status: 400 });
  if (!files.length || files.length > 50) return Response.json({ error: "Commit 1–50 files" }, { status: 400 });
  for (const f of files) {
    if (!validPath(f?.path) || !(typeof f.content === "string" || f.content === null) || (f.content?.length ?? 0) > 1_000_000) {
      return Response.json({ error: `Bad file: ${String(f?.path).slice(0, 80)}` }, { status: 400 });
    }
  }
  if (files.some((f: { path: string }) => /^\.github\/workflows\//.test(f.path))) {
    return Response.json({ error: "Workflow files (.github/workflows) can't be changed from Vlipa Code." }, { status: 400 });
  }
  const message = (typeof b.message === "string" && b.message.trim() ? b.message.trim() : "Update via Vlipa Code").slice(0, 500);
  try {
    return Response.json(await ghCommit(g.s, b.repo, b.branch, message, files, b.base ?? undefined));
  } catch (e) {
    return ghError(e);
  }
}
