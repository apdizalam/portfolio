import "server-only";
import { cache } from "react";
import { publicClient } from "./supabase/public";
import { supabaseConfigured } from "./supabase/env";
import type { Contributions, Education, Experience, Profile, Project, Skill } from "./types";
import fallbackContent from "@/data/content.json";
import { featuredProjects, findPublicProject, publishedProjects } from "./projects";
import fallbackContributions from "@/data/github-contributions.json";

export type SiteContent = {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
  source: "supabase" | "fallback";
};

// ---- Fallback: the JSON content from the old site (used until Supabase is connected)
function fromJson(): SiteContent {
  const c = fallbackContent as any;
  const img = (u: string) => (u && !/^https?:/.test(u) ? "/" + u.replace(/^\/+/, "") : u || "");
  return {
    source: "fallback",
    profile: {
      id: 1,
      name: c.profile.name,
      name_accent: c.profile.nameAccent,
      title: c.profile.title,
      tagline: c.profile.tagline,
      photo_url: img(c.profile.photo),
      about: c.profile.about,
      github: c.profile.github,
      linkedin: c.profile.linkedin,
    },
    experience: (c.experience || []).map((x: any, i: number) => ({ id: i + 1, sort: i, logo_url: "", skills: [], ...x })),
    education: (c.education || []).map((e: any, i: number) => ({ id: i + 1, sort: i, ...e })),
    skills: c.skills.map((s: any, i: number) => ({ id: i + 1, sort: i, name: s.name, icon: s.icon })),
    projects: c.projects.map((p: any, i: number) => ({
      id: i + 1,
      sort: i,
      slug: p.slug,
      title: p.title,
      summary: p.summary || "",
      repo: p.repo || "",
      live: p.live || "",
      image_url: img(p.image),
      tags: p.tags || [],
      categories: p.categories || [],
      date: p.date || "",
      app_link: p.appLink || "",
      app_note: p.appNote || "",
      subtitle: p.subtitle || "",
      problem: p.problem || "",
      solution: p.solution || "",
      features: p.features || "",
      showcase_url: img(p.showcase || ""),
      featured: p.featured !== false,
      published: p.published !== false,
    })),
  };
}

// ---- Supabase (cached per request; pages are revalidated after admin edits)
export const getContent = cache(async (): Promise<SiteContent> => {
  if (!supabaseConfigured) return fromJson();
  const db = publicClient();
  const [profile, education, skills, projects, experience] = await Promise.all([
    db.from("profile").select("*").eq("id", 1).maybeSingle(),
    db.from("education").select("*").order("sort").order("id"),
    db.from("skills").select("*").order("sort").order("id"),
    db.from("projects").select("*").eq("published", true).order("sort").order("id"),
    db.from("experience").select("*").order("sort").order("id"),
  ]);
  const err = profile.error || education.error || skills.error || projects.error;
  if (err) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      // During a deploy build a hiccup should not fail the deploy; pages refresh within a minute.
      console.error("Supabase read failed during build, using fallback content:", err.message);
      return fromJson();
    }
    // At runtime, failing keeps the previously cached (correct) page instead of showing
    // backup content in which unpublished projects could reappear.
    throw new Error("Supabase read failed: " + err.message);
  }
  const fb = fromJson();
  return {
    source: "supabase",
    profile: (profile.data as Profile) || fb.profile,
    education: (education.data as Education[]) || [],
    // experience is optional: if its table is missing, the rest of the site still loads
    experience: experience.error ? [] : ((experience.data as Experience[]) || []),
    skills: (skills.data as Skill[]) || [],
    projects: (projects.data as Project[]) || [],
  };
});

/** Featured + published projects for the home page (Featured never overrides Published) */
export async function getFeaturedProjects() {
  const { projects } = await getContent();
  return featuredProjects(projects);
}

/** All published projects for /projects */
export async function getPublishedProjects() {
  const { projects } = await getContent();
  return publishedProjects(projects);
}

/** A public project page — unpublished or unknown slugs return null (404) */
export async function getProject(slug: string) {
  const { projects } = await getContent();
  return findPublicProject(projects, slug);
}

// ---- GitHub contributions: live when GITHUB_TOKEN is set, snapshot otherwise
export async function getContributions(user: string): Promise<Contributions> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`,
          variables: { u: user },
        }),
        next: { revalidate: 60 * 60 * 6 },
      });
      const json = await res.json();
      const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
      if (cal) {
        const L: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
        return {
          total: cal.totalContributions,
          weeks: cal.weeks.map((w: any) =>
            w.contributionDays.map((d: any) => [d.date, d.contributionCount, L[d.contributionLevel] ?? 0])
          ),
        };
      }
    } catch (e) {
      console.error("GitHub contributions fetch failed", e);
    }
  }
  return fallbackContributions as Contributions;
}
