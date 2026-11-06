import { ghRepos } from "@/lib/github";
import { ghError, ghGuard } from "@/lib/githubGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await ghGuard(req);
  if (g instanceof Response) return g;
  try {
    return Response.json({ repos: await ghRepos(g.s) });
  } catch (e) {
    return ghError(e);
  }
}
