import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, getProject } from "@/lib/data";
import { getProjectReadme } from "@/lib/readme";
import Gallery from "@/components/Gallery";
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
  const steps = (project.app_note || "Open this link on your phone and tap Install.").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <main id="main">
        <ViewCounter slug={project.slug} />
        <Link href="/#projects" className="back-link"><BackIcon /> Back to projects</Link>

        <section className="pd-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img className="pd-cover" src={cover} alt={`${project.title} screenshot`} />}
          <h1 className="pd-title">{project.title}</h1>
          {project.summary && <p className="pd-summary">{project.summary}</p>}
          {project.tags.length > 0 && (
            <ul className="pd-tags">{project.tags.map((t) => <li key={t}>{t}</li>)}</ul>
          )}
          <div className="pd-actions">
            {live && /^https?:/.test(live) && (
              <a className="btn btn--solid" href={live} target="_blank" rel="noopener">Live Demo <span aria-hidden="true">→</span></a>
            )}
            {repo && (
              <a className="btn btn--outline" href={`https://github.com/${repo}`} target="_blank" rel="noopener"><GithubIcon /> View Code</a>
            )}
            {isHttps(project.app_link) && (
              <a className="btn btn--outline" href={project.app_link} target="_blank" rel="noopener"><PhoneIcon /> Mobile App</a>
            )}
          </div>
        </section>

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

        {repo && (
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
