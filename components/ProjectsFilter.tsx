"use client";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { PROJECT_FILTERS, filterByGroup, parseGroup, projectGroups, type ProjectGroup } from "@/lib/projects";
import ProjectsGrid from "./ProjectsGrid";

// Category filter for the public Projects page. The list it receives is already
// published-only (filtered on the server), so the filter can never show unpublished work.
export default function ProjectsFilter({ projects }: { projects: Project[] }) {
  const [group, setGroup] = useState<"all" | ProjectGroup>("all");

  // ?category=applications|websites makes a filtered view shareable
  useEffect(() => {
    setGroup(parseGroup(new URLSearchParams(window.location.search).get("category")));
  }, []);

  const counts = useMemo(() => {
    const c = { all: projects.length, applications: 0, websites: 0 };
    projects.forEach((p) => projectGroups(p).forEach((g) => (c[g] += 1)));
    return c;
  }, [projects]);

  const shown = filterByGroup(projects, group);

  function choose(next: "all" | ProjectGroup) {
    setGroup(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", next);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <>
      <div className="pfilter" role="group" aria-label="Filter projects by category">
        {PROJECT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pfilter__btn${group === f.id ? " is-active" : ""}`}
            aria-pressed={group === f.id}
            onClick={() => choose(f.id)}
          >
            {f.label} <span className="pfilter__count">{counts[f.id]}</span>
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "project" : "projects"}
      </p>
      {shown.length ? (
        // key resets the entrance animation when the filter changes
        <ProjectsGrid key={group} projects={shown} />
      ) : (
        <p className="readme__status">No projects in this category yet.</p>
      )}
    </>
  );
}
