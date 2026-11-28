// Education & Experience timeline: order, heading and logos (pure, unit-tested).
import type { Education, Experience } from "./types";
import { safeUrl } from "./utils";

export type TimelineItem =
  | { kind: "education"; key: string; logo: string; data: Education }
  | { kind: "experience"; key: string; logo: string; data: Experience };

const bySort = <T extends { sort: number; id: number }>(a: T, b: T) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id;

/** Education entries first (in the admin's order), then Experience entries. */
export function buildTimeline(education: Education[], experience: Experience[]): TimelineItem[] {
  return [
    ...[...education].sort(bySort).map((e) => ({ kind: "education" as const, key: `e${e.id}`, logo: safeUrl(e.logo_url), data: e })),
    ...[...experience].sort(bySort).map((x) => ({ kind: "experience" as const, key: `x${x.id}`, logo: safeUrl(x.logo_url), data: x })),
  ];
}

export function timelineHeading(education: Education[], experience: Experience[]): string {
  if (education.length && experience.length) return "Education & Experience";
  return experience.length ? "Experience" : "Education";
}
