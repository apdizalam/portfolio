import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getProject } from "@/lib/data";
import { getProjectReadme } from "@/lib/readme";
import Gallery from "@/components/Gallery";
import ShowcaseImage from "@/components/ShowcaseImage";
import SkillChip from "@/components/SkillChip";
import AnimatedCard from "@/components/AnimatedCard";
import { repoPath, safeUrl, isHttps } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import RichText from "@/components/RichText";
import { BackIcon, GithubIcon, PhoneIcon } from "@/components/Icons";
import ViewCounter from "@/components/ViewCounter";

export const revalidate = 300;

export async function generateStaticParams() {
  const { projects } = await getContent();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProject(slug);
  return p ? { title: `${p.title} — Abdisalam Mohamed Muhumed`, description: p.summary } : { title: "Project not found" };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const repo = repoPath(project.repo);
  const readme = repo ? await getProjectReadme(repo) : null;
  const shots = readme?.groups.reduce((n, g) => n + g.images.length, 0) || 0;
  const cover = safeUrl(project.image_url);
  const live = safeUrl(project.live);
  const showcase = safeUrl(project.showcase_url);
  const features = parseFeatures(project.features || "");
  const detailed = Boolean(showcase || project.problem || project.solution || features.length);
  const steps = (project.app_note || "Open this link on your phone and tap Install.").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <main id="main">
        <ViewCounter slug={project.slug} />
        <Link href="/#projects" className="back-link"><BackIcon /> Back to projects</Link>

        <section className="pd-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && !showcase && <img className="pd-cover" src={cover} alt={`${project.title} screenshot`} />}
          {showcase && project.categories.length > 0 && <p className="pd-eyebrow">{project.categories.join(" · ")}</p>}
          <h1 className="pd-title">{project.title}</h1>
          {project.subtitle && <p className="pd-subtitle">{project.subtitle}</p>}
          {project.summary && <p className="pd-summary">{project.summary}</p>}
          {!detailed && project.tags.length > 0 && (
            <ul className="pd-tags">{project.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          )}
          <div className="pd-actions">
            {detailed && isHttps(project.app_link) && (
              <a className="btn btn--solid" href={project.app_link} target="_blank" rel="noopener"><PhoneIcon /> Download Android APK</a>
            )}
            {live && /^https?:/.test(live) && (
              <a className={`btn ${detailed && isHttps(project.app_link) ? "btn--outline" : "btn--solid"}`} href={live} target="_blank" rel="noopener">
                {detailed ? "Visit Project Website" : "Live Demo"} <span aria-hidden="true">→</span>
              </a>
            )}
            {repo && (
              <a className="btn btn--outline" href={`https://github.com/${repo}`} target="_blank" rel="noopener"><GithubIcon /> View Code</a>
            )}
            {!detailed && isHttps(project.app_link) && (
              <a className="btn btn--outline" href={project.app_link} target="_blank" rel="noopener"><PhoneIcon /> Mobile App</a>
            )}
          </div>
        </section>

        {showcase && (
          <section className="section" aria-label={`${project.title} app screens`}>
            <ShowcaseImage src={showcase} alt={`${project.title} app screens`} />
          </section>
        )}

        {(project.problem || project.solution) && (
          <section className="section">
            <div className="ps-grid">
              {project.problem && (
                <AnimatedCard className="card ps-card" index={0}>
                  <h2 className="section__title">The problem</h2>
                  <RichText text={project.problem} />
                </AnimatedCard>
              )}
              {project.solution && (
                <AnimatedCard className="card ps-card ps-card--solution" index={1}>
                  <h2 className="section__title">The solution</h2>
                  <RichText text={project.solution} />
                </AnimatedCard>
              )}
            </div>
          </section>
        )}

        {features.length > 0 && (
          <section className="section">
            <h2 className="section__title">Key features</h2>
            <ul className="feature-grid">
              {features.map((f, i) => (
                <AnimatedCard as="li" key={i} className="card feature" index={i}>
                  <span className="feature__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{f.title}</h3>
                  {f.text && <p>{f.text}</p>}
                </AnimatedCard>
              ))}
            </ul>
          </section>
        )}

        {detailed && project.tags.length > 0 && (
          <section className="section">
            <h2 className="section__title">Technology stack</h2>
            <ul className="chips">{project.tags.map((t) => <SkillChip key={t} name={t} icon={techIcon(t)} />)}</ul>
          </section>
        )}

        {isHttps(project.app_link) && (
          <section className="section">
            <h2 className="section__title">Install the mobile app</h2>
            <div className="card app-card">
              <div className="app-card__icon" aria-hidden="true"><PhoneIcon /></div>
              <div className="app-card__body">
                <p className="app-card__lead">Want to use this app on your phone? Follow these steps:</p>
                <ol className="app-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <a className="btn btn--solid" href={project.app_link} target="_blank" rel="noopener">Download the app <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </section>
        )}

        {!detailed && (
          <section className="section">
            <h2 className="section__title">Overview</h2>
            <article className="card readme">
              {readme?.overview ? (
                <div dangerouslySetInnerHTML={{ __html: readme.overview }} />
              ) : (
                <RichText text={project.summary || ""} />
              )}
            </article>
          </section>
        )}

        {shots > 0 && (
          <section className="section">
            <h2 className="section__title">Screenshots</h2>
            <Gallery groups={readme!.groups} />
          </section>
        )}

        {readme?.features && (
          <section className="section">
            <details className="card readme features">
              <summary>Key features</summary>
              <div dangerouslySetInnerHTML={{ __html: readme.features }} />
            </details>
          </section>
        )}

        {repo && (readme?.overview || readme?.features) && (
          <p className="readme-more">
            Want the technical details (setup, architecture, API)?{" "}
            <a href={`https://github.com/${repo}#readme`} target="_blank" rel="noopener">Read the full README on GitHub →</a>
          </p>
        )}
      </main>
      <BottomNav />
    </>
  );
}

/** "Title: description" per line -> [{ title, text }] */
function parseFeatures(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { title: l, text: "" };
    });
}

/** devicon names for common technologies (unknown ones show the name only) */
function techIcon(name: string) {
  const map: Record<string, string> = {
    "react native": "react", react: "react", expo: "expo", typescript: "typescript", javascript: "javascript",
    "node.js": "nodejs", mongodb: "mongodb", vite: "vitejs", "next.js": "nextjs",
    postgresql: "postgresql", supabase: "supabase", axios: "axios", "react router": "reactrouter", tailwind: "tailwindcss", git: "git", github: "github",
  };
  return map[name.toLowerCase()] || "";
}
