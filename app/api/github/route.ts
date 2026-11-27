import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/supabase/server";
import { normalizeRepo, parseRepoInput, repoErrorFromResponse } from "@/lib/github";
import { GITHUB_USER } from "@/lib/utils";

// Admin-only GitHub lookups for the project form.
//   GET /api/github?repo=Tayonx      → repository details + languages
//   GET /api/github?list=1           → your public repositories (for the picker)
// The GitHub token (if set) stays on the server; the browser only gets the results.

export const dynamic = "force-dynamic";

function gh(path: string) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "portfolio-admin",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: { code: "forbidden", message: "Please sign in as an admin." } }, { status: 401 });
  }
  const url = new URL(req.url);

  try {
    if (url.searchParams.get("list")) {
      const res = await gh(`/users/${GITHUB_USER}/repos?per_page=100&sort=pushed&type=owner`);
      if (!res.ok) return NextResponse.json({ error: repoErrorFromResponse(res.status, res.headers, GITHUB_USER) }, { status: 502 });
      const repos = (await res.json()) as any[];
      return NextResponse.json({
        repos: repos
          .filter((r) => !r.fork)
          .map((r) => ({ name: r.name, description: r.description || "", private: Boolean(r.private) })),
      });
    }

    const full = parseRepoInput(url.searchParams.get("repo") || "", GITHUB_USER);
    if (!full) {
      return NextResponse.json({ error: { code: "invalid", message: "Enter a repository name like “Tayonx”, “owner/repo” or a GitHub URL." } }, { status: 400 });
    }
    const repoRes = await gh(`/repos/${full}`);
    if (!repoRes.ok) {
      const error = repoErrorFromResponse(repoRes.status, repoRes.headers, full);
      return NextResponse.json({ error }, { status: error.code === "not_found" ? 404 : 502 });
    }
    const repo = await repoRes.json();
    const langRes = await gh(`/repos/${full}/languages`);
    const languages = langRes.ok ? await langRes.json() : {};
    return NextResponse.json({ repo: normalizeRepo(repo, languages) });
  } catch {
    return NextResponse.json({ error: { code: "api_error", message: "Couldn't reach GitHub. Check your connection and try again." } }, { status: 502 });
  }
}
