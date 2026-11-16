export const GITHUB_USER = "apdizalam";
const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/";

/** devicon slug ("react") or a full https URL */
export function iconUrl(icon: string) {
  if (!icon) return "";
  if (/^https:\/\//i.test(icon)) return icon;
  const slug = icon.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return slug ? `${DEVICON}${slug}/${slug}-original.svg` : "";
}

/** only http(s) links and site-relative paths */
export function safeUrl(u?: string | null) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (/^\/?[\w./-]+$/.test(u) && !u.includes("..")) return "/" + u.replace(/^\/+/, "");
  return "";
}

export function isHttps(u?: string | null) {
  return !!u && /^https:\/\/[^\s"'<>]+$/i.test(u);
}

/** "repo" -> "apdizalam/repo"; "owner/repo" stays */
export function repoPath(repo: string) {
  if (!repo) return "";
  return repo.includes("/") ? repo : `${GITHUB_USER}/${repo}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
