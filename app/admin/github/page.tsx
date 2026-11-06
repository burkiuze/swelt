import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { getCaller } from "@/lib/auth";
import { ghConfigured, ghInstallUrl } from "@/lib/github";

export const metadata = { title: "GitHub bot — Vlipa" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const caller = await getCaller();
  if (!caller) redirect("/login?next=/admin/github");
  if (!caller.isAdmin) redirect("/account");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "https"}://${h.get("host")}`;
  const manifest = {
    name: "Vlipa Code",
    url: origin,
    description: "Lets Vlipa Code read your repositories and commit the changes you approve.",
    redirect_url: `${origin}/api/admin/github-app`,
    callback_urls: [`${origin}/api/github/callback`],
    setup_url: `${origin}/code?github=installed`,
    request_oauth_on_install: true,
    public: true,
    default_permissions: { contents: "write", metadata: "read", pull_requests: "write" },
  };
  const state = randomBytes(8).toString("hex");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">GitHub bot</h1>
      <p className="mt-2 text-muted">
        The &quot;Vlipa Code&quot; GitHub App lets Code members connect GitHub, attach repository files to the chat and commit the changes the assistant writes.
      </p>
      <div className="mt-6 rounded-2xl border border-line-2 p-5">
        <div className="text-sm">
          Status: {ghConfigured() ? <span className="text-[#7ee2a8]">configured</span> : <span className="text-[#ff9592]">not configured</span>}
          {ghInstallUrl() && (
            <>
              {" · "}
              <a className="underline" href={ghInstallUrl()!} target="_blank" rel="noreferrer">
                install page
              </a>
            </>
          )}
        </div>
        <form action={`https://github.com/settings/apps/new?state=${state}`} method="post" className="mt-4">
          <input type="hidden" name="manifest" value={JSON.stringify(manifest)} />
          <button className="btn btn-primary" type="submit">
            {ghConfigured() ? "Create a new GitHub App" : "Create the GitHub App"}
          </button>
        </form>
        <p className="mt-3 text-xs text-dim">
          GitHub opens with everything filled in; pick a unique name if &quot;Vlipa Code&quot; is taken, then press Create. You&apos;ll come back here with the three values to add to Vercel.
        </p>
      </div>
    </div>
  );
}
