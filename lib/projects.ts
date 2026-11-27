// Pure project rules shared by the public pages, the admin and the tests.
// No server-only imports here so it can be unit-tested and used in client components.
import type { Project } from "./types";

type Visibility = Pick<Project, "published" | "featured">;

/** Published decides whether a project is public at all. Missing value = published (older rows). */
export const isPublished = (p: Visibility) => p.published !== false;

/** Featured only highlights a project that is already published — it never overrides Published. */
export const isFeatured = (p: Visibility) => isPublished(p) && p.featured !== false;

const bySort = <T extends Pick<Project, "sort" | "id">>(a: T, b: T) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id;

/** Everything a visitor may see, in the admin's order. */
export function publishedProjects<T extends Project>(projects: T[]): T[] {
  return projects.filter(isPublished).sort(bySort);
}

/** Homepage "Featured Projects": published AND featured. */
export function featuredProjects<T extends Project>(projects: T[]): T[] {
  return projects.filter(isFeatured).sort(bySort);
}

/** A public project page: only for published projects (unpublished → not found). */
export function findPublicProject<T extends Project>(projects: T[], slug: string): T | null {
  return projects.find((p) => p.slug === slug && isPublished(p)) || null;
}

// ---------------------------------------------------------------- categories
// Visitors filter by two groups. A project's free-text categories ("Web App", "Website",
// "Mobile App", "Landing page"…) are matched by whole words, so "Website" and "Web App"
// are never confused and a project with both kinds appears in both filters.

export type ProjectGroup = "applications" | "websites";

export const PROJECT_FILTERS: { id: "all" | ProjectGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "applications", label: "Applications" },
  { id: "websites", label: "Websites" },
];

const APP_WORDS = new Set(["app", "apps", "application", "applications", "mobile", "android", "ios", "desktop", "pwa", "saas", "dashboard"]);
const SITE_WORDS = new Set(["website", "websites", "site", "sites", "webpage", "webpages", "landing", "blog", "portfolio", "ecommerce"]);

const words = (category: string) =>
  category
    .toLowerCase()
    .replace(/e-commerce/g, "ecommerce")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Which visitor-facing groups a project belongs to (can be none, one or both). */
export function projectGroups(p: Pick<Project, "categories">): ProjectGroup[] {
  const found = new Set<ProjectGroup>();
  for (const c of p.categories || []) {
    for (const w of words(c)) {
      if (APP_WORDS.has(w)) found.add("applications");
      if (SITE_WORDS.has(w)) found.add("websites");
    }
  }
  return (["applications", "websites"] as const).filter((g) => found.has(g));
}

/** Filter a list for the Projects page. "all" keeps everything. */
export function filterByGroup<T extends Project>(projects: T[], group: "all" | ProjectGroup): T[] {
  if (group === "all") return projects;
  return projects.filter((p) => projectGroups(p).includes(group));
}

export function parseGroup(value: string | null | undefined): "all" | ProjectGroup {
  return value === "applications" || value === "websites" ? value : "all";
}
