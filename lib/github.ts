// GitHub bot ("Vlipa Code" GitHub App). Users authorize the app; their user-to-server token is kept
// in an encrypted, httpOnly cookie (nothing is stored in the database). Commits made with it show
// the user as author, made "with Vlipa Code".
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const GH_COOKIE = "vlipa_gh";
export const GH_STATE = "vlipa_gh_state";
const API = "https://api.github.com";

export const ghConfigured = () => !!(process.env.GITHUB_APP_CLIENT_ID && process.env.GITHUB_APP_CLIENT_SECRET);
export const ghInstallUrl = () => (process.env.GITHUB_APP_SLUG ? `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new` : null);

export type GhSession = { token: string; refresh?: string; exp?: number; login: string; uid: string };

const key = () => createHash("sha256").update(`gh:${process.env.AUTH_SECRET || process.env.SWELT_DB_SECRET || "vlipa"}`).digest();

export function seal(v: unknown) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(v), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}

export function unseal<T>(s: string | undefined): T | null {
  if (!s) return null;
  try {
    const b = Buffer.from(s, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

async function oauthToken(params: Record<string, string>) {
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.GITHUB_APP_CLIENT_ID, client_secret: process.env.GITHUB_APP_CLIENT_SECRET, ...params }),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
  if (!j.access_token) throw new Error(j.error_description || "GitHub sign-in failed");
  return { token: j.access_token, refresh: j.refresh_token, exp: j.expires_in ? Date.now() + j.expires_in * 1000 : undefined };
}

/** OAuth callback: code → token → cookie bound to the Vlipa user. */
export async function ghConnect(code: string, uid: string) {
  const t = await oauthToken({ code });
  const me = await fetch(`${API}/user`, { headers: ghHeaders(t.token), cache: "no-store" }).then((r) => r.json());
  const s: GhSession = { ...t, login: String(me.login || ""), uid };
  (await cookies()).set(GH_COOKIE, seal(s), cookieOpts);
  return s;
}

export async function ghDisconnect() {
  (await cookies()).delete(GH_COOKIE);
}

/** The caller's GitHub session (refreshed when it is about to expire), or null. */
export async function ghSession(uid: string): Promise<GhSession | null> {
  const jar = await cookies();
  const s = unseal<GhSession>(jar.get(GH_COOKIE)?.value);
  if (!s || s.uid !== uid) return null;
  if (s.exp && s.exp - Date.now() < 5 * 60_000) {
    if (!s.refresh) return null;
    try {
      const t = await oauthToken({ grant_type: "refresh_token", refresh_token: s.refresh });
      const next = { ...s, ...t };
      jar.set(GH_COOKIE, seal(next), cookieOpts);
      return next;
    } catch {
      jar.delete(GH_COOKIE);
      return null;
    }
  }
  return s;
}

const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "Vlipa-Code",
});

export async function gh<T = Record<string, unknown>>(s: GhSession, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: init?.method || "GET",
    headers: { ...ghHeaders(s.token), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((j as { message?: string }).message || `GitHub HTTP ${r.status}`) as Error & { status?: number };
    e.status = r.status;
    throw e;
  }
  return j as T;
}

export const validRepo = (r: unknown): r is string => typeof r === "string" && /^[\w.-]+\/[\w.-]+$/.test(r);
export const validBranch = (b: unknown): b is string => typeof b === "string" && /^[\w./-]{1,200}$/.test(b) && !b.includes("..");
export const validPath = (p: unknown): p is string =>
  typeof p === "string" && p.length > 0 && p.length < 400 && !p.startsWith("/") && !p.split("/").some((x) => x === ".." || x === "." || x === "" || x === ".git");

/** Repositories the user installed the bot on. */
export async function ghRepos(s: GhSession) {
  const inst = await gh<{ installations: { id: number }[] }>(s, "/user/installations?per_page=100");
  const out: { full_name: string; private: boolean; default_branch: string }[] = [];
  for (const i of inst.installations.slice(0, 10)) {
    const r = await gh<{ repositories: { full_name: string; private: boolean; default_branch: string }[] }>(s, `/user/installations/${i.id}/repositories?per_page=100`);
    for (const x of r.repositories) out.push({ full_name: x.full_name, private: x.private, default_branch: x.default_branch });
  }
  return out.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

/**
 * Commits files to a branch with the Git Data API (one commit for all files). When `base` is given and
 * the branch doesn't exist yet, it is created from `base`.
 */
export async function ghCommit(s: GhSession, repo: string, branch: string, message: string, files: { path: string; content: string | null }[], base?: string) {
  let parentSha: string;
  try {
    parentSha = (await gh<{ object: { sha: string } }>(s, `/repos/${repo}/git/ref/heads/${encodeURI(branch)}`)).object.sha;
  } catch (e) {
    if ((e as { status?: number }).status !== 404 || !base) throw e;
    parentSha = (await gh<{ object: { sha: string } }>(s, `/repos/${repo}/git/ref/heads/${encodeURI(base)}`)).object.sha;
    await gh(s, `/repos/${repo}/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch}`, sha: parentSha } });
  }
  const parent = await gh<{ tree: { sha: string } }>(s, `/repos/${repo}/git/commits/${parentSha}`);
  const tree = await gh<{ sha: string }>(s, `/repos/${repo}/git/trees`, {
    method: "POST",
    body: {
      base_tree: parent.tree.sha,
      tree: files.map((f) => (f.content === null ? { path: f.path, mode: "100644", type: "blob", sha: null } : { path: f.path, mode: "100644", type: "blob", content: f.content })),
    },
  });
  const commit = await gh<{ sha: string; html_url: string }>(s, `/repos/${repo}/git/commits`, { method: "POST", body: { message, tree: tree.sha, parents: [parentSha] } });
  await gh(s, `/repos/${repo}/git/refs/heads/${encodeURI(branch)}`, { method: "PATCH", body: { sha: commit.sha } });
  return { sha: commit.sha, url: `https://github.com/${repo}/commit/${commit.sha}` };
}
