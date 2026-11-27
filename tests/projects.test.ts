import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/types";
import {
  featuredProjects, filterByGroup, findPublicProject, isFeatured, isPublished,
  parseGroup, projectGroups, publishedProjects,
} from "@/lib/projects";

const make = (over: Partial<Project>): Project => ({
  id: 1, slug: "p", title: "P", summary: "", repo: "", live: "", image_url: "", tags: [],
  categories: [], date: "", app_link: "", app_note: "", sort: 0, featured: true, published: true, views: 0,
  ...over,
});

// The three real projects (categories as stored in the database)
const kobaniq = make({ id: 1, slug: "kobaniq", sort: 0, categories: ["Full-stack", "AI", "Mobile App"], views: 12 });
const shaba = make({ id: 2, slug: "shaba-billing-system", sort: 1, categories: ["Full-stack", "Web App", "Mobile App"] });
const tayonx = make({ id: 3, slug: "tayonx", sort: 2, categories: ["Website", "Marketplace"] });

describe("Published vs Featured", () => {
  it("published OFF hides a project everywhere, even when featured", () => {
    const hidden = make({ slug: "secret", published: false, featured: true });
    expect(isPublished(hidden)).toBe(false);
    expect(isFeatured(hidden)).toBe(false);
    expect(featuredProjects([hidden, tayonx]).map((p) => p.slug)).toEqual(["tayonx"]);
    expect(publishedProjects([hidden, tayonx]).map((p) => p.slug)).toEqual(["tayonx"]);
  });

  it("featured OFF + published ON: on /projects but not on the homepage", () => {
    const quiet = make({ slug: "quiet", featured: false, published: true });
    expect(publishedProjects([quiet]).map((p) => p.slug)).toEqual(["quiet"]);
    expect(featuredProjects([quiet])).toEqual([]);
  });

  it("featured ON + published ON: on both", () => {
    expect(featuredProjects([kobaniq]).map((p) => p.slug)).toEqual(["kobaniq"]);
    expect(publishedProjects([kobaniq]).map((p) => p.slug)).toEqual(["kobaniq"]);
  });

  it("older rows without the columns count as published + featured", () => {
    const legacy = make({ slug: "legacy" });
    delete (legacy as Partial<Project>).published;
    delete (legacy as Partial<Project>).featured;
    expect(isPublished(legacy)).toBe(true);
    expect(isFeatured(legacy)).toBe(true);
  });

  it("homepage and /projects keep the admin's order", () => {
    const list = [tayonx, kobaniq, make({ id: 4, slug: "z", sort: 1 })];
    expect(publishedProjects(list).map((p) => p.slug)).toEqual(["kobaniq", "z", "tayonx"]);
    expect(featuredProjects(list).map((p) => p.slug)).toEqual(["kobaniq", "z", "tayonx"]);
  });

  it("does not drop view counts", () => {
    expect(publishedProjects([kobaniq])[0].views).toBe(12);
  });
});

describe("Project pages (direct URL access)", () => {
  it("finds a published project by slug", () => {
    expect(findPublicProject([kobaniq, tayonx], "tayonx")?.slug).toBe("tayonx");
  });
  it("returns nothing for an unpublished project, so the page is a 404", () => {
    const hidden = make({ slug: "draft", published: false });
    expect(findPublicProject([hidden], "draft")).toBeNull();
  });
  it("returns nothing for unknown slugs", () => {
    expect(findPublicProject([kobaniq], "nope")).toBeNull();
  });
});

describe("Category groups", () => {
  it("classifies the real projects", () => {
    expect(projectGroups(kobaniq)).toEqual(["applications"]);
    expect(projectGroups(shaba)).toEqual(["applications"]);   // "Web App" is an application, not a website
    expect(projectGroups(tayonx)).toEqual(["websites"]);
  });

  it("a project with both kinds appears in both filters", () => {
    const both = make({ categories: ["Website", "Mobile App"] });
    expect(projectGroups(both)).toEqual(["applications", "websites"]);
  });

  it("matches whole words and ignores case and spacing", () => {
    expect(projectGroups(make({ categories: ["  LANDING page "] }))).toEqual(["websites"]);
    expect(projectGroups(make({ categories: ["e-commerce"] }))).toEqual(["websites"]);
    expect(projectGroups(make({ categories: ["Android", "iOS"] }))).toEqual(["applications"]);
    // "Apple" or "Applesauce" must not count as an app
    expect(projectGroups(make({ categories: ["Apple", "Applesauce"] }))).toEqual([]);
  });

  it("projects with no matching category stay in All only", () => {
    const other = make({ categories: ["AI", "Full-stack"] });
    expect(projectGroups(other)).toEqual([]);
    expect(filterByGroup([other], "all")).toHaveLength(1);
    expect(filterByGroup([other], "applications")).toHaveLength(0);
  });

  it("filters the published list", () => {
    const visible = publishedProjects([kobaniq, { ...shaba, published: false }, tayonx]);
    expect(filterByGroup(visible, "all").map((p) => p.slug)).toEqual(["kobaniq", "tayonx"]);
    expect(filterByGroup(visible, "applications").map((p) => p.slug)).toEqual(["kobaniq"]);
    expect(filterByGroup(visible, "websites").map((p) => p.slug)).toEqual(["tayonx"]);
  });

  it("an unpublished project never reaches a category filter", () => {
    const visible = publishedProjects([{ ...shaba, published: false }]);
    expect(filterByGroup(visible, "applications")).toEqual([]);
  });

  it("parses the ?category= value safely", () => {
    expect(parseGroup("websites")).toBe("websites");
    expect(parseGroup("applications")).toBe("applications");
    expect(parseGroup("anything-else")).toBe("all");
    expect(parseGroup(null)).toBe("all");
  });

  it("does not change the stored categories", () => {
    const p = make({ categories: ["Website", "Marketplace"] });
    projectGroups(p);
    expect(p.categories).toEqual(["Website", "Marketplace"]);
  });
});
