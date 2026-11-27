import { describe, expect, it } from "vitest";
import {
  mergeSuggestions, normalizeRepo, parseRepoInput, prettyTitle, repoErrorFromResponse,
  suggestionsFromRepo, techFromRepo,
} from "@/lib/github";

const headers = (h: Record<string, string> = {}) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });

const apiRepo = {
  name: "Tayonx",
  full_name: "apdizalam/Tayonx",
  owner: { login: "apdizalam" },
  html_url: "https://github.com/apdizalam/Tayonx",
  description: "Cargo marketplace ",
  homepage: "https://tayonx.vercel.app",
  topics: ["react", "nodejs", "logistics"],
  created_at: "2026-11-05T15:47:58Z",
  pushed_at: "2026-11-15T08:57:04Z",
  private: false,
  archived: false,
};

describe("parseRepoInput", () => {
  it("accepts a name, owner/name or a URL", () => {
    expect(parseRepoInput("Tayonx", "apdizalam")).toBe("apdizalam/Tayonx");
    expect(parseRepoInput("someone/thing", "apdizalam")).toBe("someone/thing");
    expect(parseRepoInput("https://github.com/apdizalam/koobanIQ.git", "apdizalam")).toBe("apdizalam/koobanIQ");
    expect(parseRepoInput("https://github.com/apdizalam/koobanIQ/", "apdizalam")).toBe("apdizalam/koobanIQ");
  });
  it("rejects empty or invalid input", () => {
    expect(parseRepoInput("   ", "apdizalam")).toBeNull();
    expect(parseRepoInput("bad name!", "apdizalam")).toBeNull();
  });
});

describe("normalizeRepo + suggestions", () => {
  const meta = normalizeRepo(apiRepo, { JavaScript: 500, CSS: 300, HTML: 10 });

  it("keeps the useful metadata", () => {
    expect(meta).toMatchObject({
      name: "Tayonx", fullName: "apdizalam/Tayonx", url: "https://github.com/apdizalam/Tayonx",
      description: "Cargo marketplace", homepage: "https://tayonx.vercel.app", isPrivate: false,
    });
    expect(meta.languages).toEqual(["JavaScript", "CSS", "HTML"]);
  });

  it("ignores a homepage that isn't a web link", () => {
    expect(normalizeRepo({ ...apiRepo, homepage: "not a url" }).homepage).toBe("");
  });

  it("turns topics + languages into tech tags without duplicates", () => {
    expect(techFromRepo({ topics: ["react", "nodejs", "javascript"], languages: ["JavaScript", "CSS"] }))
      .toEqual(["React", "Node.js", "JavaScript", "CSS"]);
  });

  it("suggests title, slug, description, website, tech and date", () => {
    expect(suggestionsFromRepo(meta, "apdizalam")).toEqual({
      repo: "Tayonx",
      title: "Tayonx",
      slug: "tayonx",
      summary: "Cargo marketplace",
      live: "https://tayonx.vercel.app",
      tags: "React, Node.js, JavaScript, CSS, HTML",
      date: "Nov 2026",
    });
  });

  it("keeps owner/name for someone else's repository", () => {
    expect(suggestionsFromRepo({ ...meta, owner: "other", fullName: "other/Tayonx" }, "apdizalam").repo).toBe("other/Tayonx");
  });

  it("makes readable titles", () => {
    expect(prettyTitle("shaba-billing_system")).toBe("Shaba Billing System");
    expect(prettyTitle("koobanIQ")).toBe("Kooban IQ");
  });
});

describe("GitHub errors", () => {
  it("missing or private repository", () => {
    const e = repoErrorFromResponse(404, headers(), "apdizalam/nope");
    expect(e.code).toBe("not_found");
    expect(e.message).toMatch(/private/);
  });
  it("rate limit", () => {
    expect(repoErrorFromResponse(403, headers({ "x-ratelimit-remaining": "0" }), "a/b").code).toBe("rate_limited");
    expect(repoErrorFromResponse(429, headers(), "a/b").code).toBe("rate_limited");
  });
  it("permission / token problem", () => {
    expect(repoErrorFromResponse(401, headers(), "a/b").code).toBe("unauthorized");
    expect(repoErrorFromResponse(403, headers({ "x-ratelimit-remaining": "40" }), "a/b").code).toBe("unauthorized");
  });
  it("other API errors", () => {
    expect(repoErrorFromResponse(500, headers(), "a/b").code).toBe("api_error");
  });
});

describe("mergeSuggestions (never overwrite the admin's text)", () => {
  const suggested = { title: "Tayonx", summary: "Cargo marketplace", tags: "React" };

  it("fills empty fields", () => {
    const { next, changed } = mergeSuggestions({ title: "", summary: "", tags: "" }, suggested, {});
    expect(next).toEqual(suggested);
    expect(changed.sort()).toEqual(["summary", "tags", "title"]);
  });

  it("keeps fields the admin wrote", () => {
    const { next, changed } = mergeSuggestions({ title: "My title", summary: "", tags: "Vue" }, suggested, {});
    expect(next.title).toBe("My title");
    expect(next.tags).toBe("Vue");
    expect(next.summary).toBe("Cargo marketplace");
    expect(changed).toEqual(["summary"]);
  });

  it("updates a field GitHub filled before, if the admin didn't change it (refresh while editing)", () => {
    const first = mergeSuggestions({ title: "", summary: "", tags: "" }, suggested, {});
    const refreshed = mergeSuggestions(first.next, { ...suggested, summary: "New description" }, first.filled);
    expect(refreshed.next.summary).toBe("New description");
  });

  it("stops updating a field once the admin edits it", () => {
    const first = mergeSuggestions({ title: "", summary: "", tags: "" }, suggested, {});
    const edited = { ...first.next, summary: "Written by me" };
    const refreshed = mergeSuggestions(edited, { ...suggested, summary: "New description" }, first.filled);
    expect(refreshed.next.summary).toBe("Written by me");
    expect(refreshed.changed).not.toContain("summary");
  });

  it("existing project values (loaded from the database) are never overwritten on refresh", () => {
    const fromDb = { title: "Tayonx", summary: "My own description", tags: "React, Node.js" };
    const { next } = mergeSuggestions(fromDb, { title: "Tayonx", summary: "GitHub description", tags: "JavaScript" }, {});
    expect(next).toEqual(fromDb);
  });
});
