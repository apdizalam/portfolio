// GitHub repository metadata: pure helpers (normalising, errors, filling the form).
// Network calls happen only on the server (app/api/github/route.ts) so tokens never reach the browser.

export type RepoMeta = {
  name: string;          // "Tayonx"
  fullName: string;      // "apdizalam/Tayonx"
  owner: string;
  url: string;           // https://github.com/apdizalam/Tayonx
  description: string;
  homepage: string;      // website set on the repo, if any
  topics: string[];
  languages: string[];   // by amount of code, largest first
  createdAt: string;     // ISO
  pushedAt: string;      // ISO
  isPrivate: boolean;
  archived: boolean;
};

export type RepoError = { code: "invalid" | "not_found" | "rate_limited" | "unauthorized" | "api_error"; message: string };

/** Accepts "repo", "owner/repo", or a GitHub URL. Returns "owner/repo" or null. */
export function parseRepoInput(input: string, defaultOwner: string): string | null {
  const v = input.trim().replace(/\.git$/i, "").replace(/\/+$/, "");
  if (!v) return null;
  const fromUrl = /github\.com[/:]([\w.-]+)\/([\w.-]+)/i.exec(v);
  const full = fromUrl ? `${fromUrl[1]}/${fromUrl[2]}` : v.includes("/") ? v : `${defaultOwner}/${v}`;
  return /^[\w.-]+\/[\w.-]+$/.test(full) ? full : null;
}

/** GitHub REST JSON → our shape */
export function normalizeRepo(repo: any, languages: Record<string, number> = {}): RepoMeta {
  return {
    name: String(repo?.name || ""),
    fullName: String(repo?.full_name || ""),
    owner: String(repo?.owner?.login || ""),
    url: String(repo?.html_url || ""),
    description: String(repo?.description || "").trim(),
    homepage: /^https?:\/\//i.test(repo?.homepage || "") ? String(repo.homepage).trim() : "",
    topics: Array.isArray(repo?.topics) ? repo.topics.map(String) : [],
    languages: Object.entries(languages).sort((a, b) => b[1] - a[1]).map(([l]) => l),
    createdAt: String(repo?.created_at || ""),
    pushedAt: String(repo?.pushed_at || ""),
    isPrivate: Boolean(repo?.private),
    archived: Boolean(repo?.archived),
  };
}

/** HTTP status + headers from GitHub → a clear message for the admin. */
export function repoErrorFromResponse(status: number, headers: { get(name: string): string | null }, fullName: string): RepoError {
  if (status === 404) {
    return { code: "not_found", message: `Couldn't find ${fullName}. Check the name — if the repository is private, the portfolio's GitHub token has no access to it.` };
  }
  if ((status === 403 || status === 429) && (headers.get("x-ratelimit-remaining") === "0" || status === 429)) {
    const reset = Number(headers.get("x-ratelimit-reset"));
    const mins = reset ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60000)) : null;
    return { code: "rate_limited", message: `GitHub's rate limit was reached.${mins ? ` Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` : " Try again later."}` };
  }
  if (status === 401 || status === 403) {
    return { code: "unauthorized", message: "GitHub refused access. The repository may be private, or the portfolio's GITHUB_TOKEN may be invalid or expired." };
  }
  return { code: "api_error", message: `GitHub returned an error (${status}). Try again in a moment.` };
}

// ---------------------------------------------------------------- form filling

export const prettyTitle = (name: string) =>
  name.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

export const monthYear = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "";

const TOPIC_NAMES: Record<string, string> = {
  react: "React", "react-native": "React Native", nextjs: "Next.js", "next-js": "Next.js", nodejs: "Node.js", "node-js": "Node.js",
  express: "Express", expressjs: "Express", mongodb: "MongoDB", typescript: "TypeScript", javascript: "JavaScript", expo: "Expo",
  vite: "Vite", tailwindcss: "Tailwind CSS", supabase: "Supabase", postgresql: "PostgreSQL", firebase: "Firebase", gemini: "Google Gemini AI",
};

/** Languages + recognised topics → tech tags (max 12, no duplicates). */
export function techFromRepo(meta: Pick<RepoMeta, "languages" | "topics">): string[] {
  const out: string[] = [];
  const add = (t: string) => { if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t); };
  meta.topics.forEach((t) => TOPIC_NAMES[t.toLowerCase()] && add(TOPIC_NAMES[t.toLowerCase()]));
  meta.languages.forEach(add);
  return out.slice(0, 12);
}

/** What GitHub can fill in, as form values */
export function suggestionsFromRepo(meta: RepoMeta, ownerLogin: string) {
  return {
    repo: meta.owner.toLowerCase() === ownerLogin.toLowerCase() ? meta.name : meta.fullName,
    title: prettyTitle(meta.name),
    slug: meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60),
    summary: meta.description,
    live: meta.homepage,
    tags: techFromRepo(meta).join(", "),
    date: monthYear(meta.createdAt),
  };
}

export type FormFields = Record<string, string>;

/**
 * Apply GitHub suggestions without overwriting the admin's own text:
 * a field is filled only if it is empty, or still holds the value GitHub filled last time.
 * Returns the new values, the names of fields that changed, and the new "last filled" record.
 */
export function mergeSuggestions(current: FormFields, suggested: FormFields, lastFilled: FormFields) {
  const next = { ...current };
  const changed: string[] = [];
  const filled = { ...lastFilled };
  for (const [key, value] of Object.entries(suggested)) {
    if (!value) continue;
    const cur = (current[key] || "").trim();
    const untouched = cur === "" || (lastFilled[key] !== undefined && cur === lastFilled[key]);
    if (untouched && cur !== value) {
      next[key] = value;
      changed.push(key);
    }
    if (untouched) filled[key] = value;
  }
  return { next, changed, filled };
}
