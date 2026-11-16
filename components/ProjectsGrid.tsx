"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { Project } from "@/lib/types";
import { repoPath, safeUrl } from "@/lib/utils";
import { ArrowUpRight, GithubIcon, GlobeIcon } from "./Icons";

function ProjectCard({ p, index }: { p: Project; index: number }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const href = `/projects/${p.slug}`;
  const live = safeUrl(p.live);
  const repo = repoPath(p.repo);

  return (
    <motion.article
      className="pcard"
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay: (index % 2) * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) router.push(href); }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
    >
      <div className="pcard__media">
        <Link href={href} className="pcard__media-link" aria-label={`Open ${p.title}`}>
          <div className="pcard__zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pcard__img" src={safeUrl(p.image_url) || "/assets/profile.jpg"} alt={`${p.title} preview`} loading="lazy" decoding="async" />
          </div>
        </Link>
        {(live || repo) && (
          <div className="pcard__pills">
            {live && /^https?:/.test(live) && (
              <a className="pcard__pill" href={live} target="_blank" rel="noopener"><GlobeIcon />Website</a>
            )}
            {repo && (
              <a className="pcard__pill" href={`https://github.com/${repo}`} target="_blank" rel="noopener"><GithubIcon />Source</a>
            )}
          </div>
        )}
      </div>

      <div className="pcard__body">
        {p.categories?.length > 0 && (
          <div className="pcard__badges">
            {p.categories.map((c) => <span key={c} className="pcard__badge">{c}</span>)}
          </div>
        )}
        <div className="pcard__head">
          <div className="pcard__titles">
            <h3 className="pcard__title"><Link href={href}>{p.title}</Link></h3>
            {p.date && <time className="pcard__date">{p.date}</time>}
          </div>
          <Link href={href} className="pcard__arrow" aria-label={`Open ${p.title}`}><ArrowUpRight /></Link>
        </div>
        {p.summary && <p className="pcard__desc">{p.summary}</p>}
        {p.tags?.length > 0 && (
          <div className="pcard__stack">
            {p.tags.map((t) => <span key={t} className="pcard__tech">{t}</span>)}
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  if (!projects.length) return <p className="readme__status">No projects yet.</p>;
  return (
    <div className="pgrid">
      {projects.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}
    </div>
  );
}
