import { describe, expect, it } from "vitest";
import type { Education, Experience } from "@/lib/types";
import { buildTimeline } from "@/lib/timeline";

const edu = (over: Partial<Education>): Education => ({ id: 1, school: "Amoud University", degree: "", dates: "", place: "", sort: 0, ...over });
const xp = (over: Partial<Experience>): Experience => ({
  id: 1, role: "Role", company: "", employment_type: "", period: "", location: "", work_mode: "",
  description: "", skills: [], logo_url: "", sort: 0, ...over,
});

const amoud = edu({ id: 1, sort: 0, logo_url: "/assets/logos/amoud-university-seal.png" });
const meta = edu({ id: 2, school: "Meta", degree: "Meta Full Stack Developer", sort: 1, logo_url: "/assets/logos/meta-symbol.svg" });
const volunteer = xp({ id: 1, role: "Data Collection Volunteer", company: "Amoud University (Jaamacadda Camuud)", sort: 0, logo_url: "/assets/logos/amoud-university-seal.png" });
const intern = xp({ id: 2, role: "ICT Intern", company: "Somaliland Ministry of Trade and Tourism", sort: 1 });
const nec = xp({ id: 3, role: "Polling Station Chairman", company: "Somaliland Electoral Commission (NEC)", sort: 2 });

describe("Education & Experience order", () => {
  it("puts every Education entry before every Experience entry", () => {
    const items = buildTimeline([amoud, meta], [volunteer, intern, nec]);
    expect(items.map((i) => i.kind)).toEqual(["education", "education", "experience", "experience", "experience"]);
  });

  it("keeps the admin's order inside each group, even if the data arrives unsorted", () => {
    const items = buildTimeline([meta, amoud], [nec, volunteer, intern]);
    expect(items.map((i) => i.key)).toEqual(["e1", "e2", "x1", "x2", "x3"]);
  });

  it("includes Meta Full Stack Developer with no invented dates", () => {
    const m = buildTimeline([amoud, meta], []).find((i) => i.kind === "education" && i.data.school === "Meta");
    if (m?.kind !== "education") throw new Error("Meta entry missing");
    expect(m.data.degree).toBe("Meta Full Stack Developer");
    expect(m.data.dates).toBe("");
  });

  it("works with only one kind of entry", () => {
    expect(buildTimeline([], [intern]).map((i) => i.kind)).toEqual(["experience"]);
    expect(buildTimeline([amoud], []).map((i) => i.kind)).toEqual(["education"]);
    expect(buildTimeline([], [])).toEqual([]);
  });
});

describe("Logos", () => {
  it("passes real logo paths through", () => {
    const items = buildTimeline([amoud, meta], [volunteer]);
    expect(items.map((i) => i.logo)).toEqual([
      "/assets/logos/amoud-university-seal.png",
      "/assets/logos/meta-symbol.svg",
      "/assets/logos/amoud-university-seal.png",
    ]);
  });

  it("entries without a logo get none (the page then shows a neutral icon)", () => {
    const items = buildTimeline([], [xp({ id: 7 })]);
    expect(items.map((i) => i.logo)).toEqual([""]);
  });

  it("the Ministry and NEC roles use the Somaliland national emblem", () => {
    const emblem = "/assets/logos/somaliland-national-emblem.png";
    const items = buildTimeline([], [{ ...intern, logo_url: emblem }, { ...nec, logo_url: emblem }]);
    expect(items.map((i) => i.logo)).toEqual([emblem, emblem]);
  });

  it("older education rows without the logo column still work", () => {
    const old = edu({ id: 9 });
    delete (old as Partial<Education>).logo_url;
    expect(buildTimeline([old], [])[0].logo).toBe("");
  });

  it("rejects unsafe logo links", () => {
    const bad = edu({ id: 5, logo_url: "javascript:alert(1)" });
    const traversal = edu({ id: 6, logo_url: "../../secret.png" });
    expect(buildTimeline([bad, traversal], []).map((i) => i.logo)).toEqual(["", ""]);
  });
});
