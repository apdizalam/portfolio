"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { GITHUB_USER, isHttps, safeUrl, slugify } from "@/lib/utils";
import { db, dbError, refreshSite, splitList, uploadImage } from "./helpers";
import { PageHead, StatusText, Switch, useStatus } from "./ui";
import { ProjectCard } from "../ProjectsGrid";
import { BackIcon } from "../Icons";

type Draft = {
  title: string; slug: string; summary: string; repo: string; live: string; image_url: string;
  tags: string; categories: string; date: string; app_link: string; app_note: string;
  featured: boolean; published: boolean;
  subtitle: string; problem: string; solution: string; features: string; showcase_url: string;
};
const EMPTY: Draft = {
  title: "", slug: "", summary: "", repo: "", live: "", image_url: "", tags: "", categories: "",
  date: "", app_link: "", app_note: "", featured: true, published: true,
  subtitle: "", problem: "", solution: "", features: "", showcase_url: "",
};

export default function ProjectForm({ id }: { id?: number }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(EMPTY);
  const [original, setOriginal] = useState<Project | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [showcaseFile, setShowcaseFile] = useState<File | null>(null);
  const [showcasePreview, setShowcasePreview] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const st = useStatus();

  useEffect(() => {
    if (!id) return;
    db().from("projects").select("*").eq("id", id).maybeSingle().then(({ data, error }) => {
      if (error || !data) { st.fail(error ? dbError(error.message) : "Project not found."); setLoaded(true); return; }
      const p = data as Project;
      setOriginal(p);
      setSlugTouched(true);
      setD({
        title: p.title, slug: p.slug, summary: p.summary, repo: p.repo, live: p.live, image_url: p.image_url,
        tags: (p.tags || []).join(", "), categories: (p.categories || []).join(", "), date: p.date,
        app_link: p.app_link, app_note: p.app_note, featured: p.featured !== false, published: p.published !== false,
        subtitle: p.subtitle || "", problem: p.problem || "", solution: p.solution || "", features: p.features || "", showcase_url: p.showcase_url || "",
      });
      setPreview(safeUrl(p.image_url));
      setShowcasePreview(safeUrl(p.showcase_url));
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setD((x) => ({ ...x, [k]: v, ...(k === "title" && !slugTouched ? { slug: slugify(v) } : {}) }));
  };

  async function fillFromGitHub() {
    if (!d.repo.trim()) return st.fail("Type the repo name first.");
    const full = d.repo.includes("/") ? d.repo.trim() : `${GITHUB_USER}/${d.repo.trim()}`;
    st.info(`Reading ${full} from GitHub…`);
    try {
      const [info, langs] = await Promise.all([
        fetch(`https://api.github.com/repos/${full}`).then((r) => { if (!r.ok) throw new Error("nf"); return r.json(); }),
        fetch(`https://api.github.com/repos/${full}/languages`).then((r) => (r.ok ? r.json() : {})),
      ]);
      setD((x) => {
        const title = x.title || info.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        return {
          ...x,
          repo: info.owner.login.toLowerCase() === GITHUB_USER.toLowerCase() ? info.name : info.full_name,
          title,
          slug: x.slug || slugify(info.name),
          summary: x.summary || info.description || "",
          live: x.live || info.homepage || "",
          tags: x.tags || [...(info.topics || []), ...Object.keys(langs)].slice(0, 6).join(", "),
          date: x.date || new Date(info.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        };
      });
      st.ok("Filled from GitHub. Add a cover image, then save.");
    } catch (e: any) {
      st.fail(e.message === "nf" ? "Couldn't find that public repo." : "GitHub is busy, try again in a minute.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(d.slug || d.title);
    if (!d.title.trim()) return st.fail("Please add a title.");
    if (!slug) return st.fail("Please add a URL slug.");
    if (d.live && !/^https?:\/\//i.test(d.live)) return st.fail("The live link must start with https://");
    if (d.app_link && !isHttps(d.app_link)) return st.fail("The app link must start with https://");

    setBusy(true);
    try {
      let image_url = d.image_url;
      if (file) { st.info("Uploading image…"); image_url = await uploadImage(file, "projects", slug); }
      let showcase_url = d.showcase_url;
      if (showcaseFile) { st.info("Uploading showcase image…"); showcase_url = await uploadImage(showcaseFile, "projects", `${slug}-showcase`, 1600); }
      const row: Record<string, unknown> = {
        slug, title: d.title.trim(), summary: d.summary.trim(), repo: d.repo.trim(), live: d.live.trim(), image_url,
        tags: splitList(d.tags), categories: splitList(d.categories), date: d.date.trim(),
        app_link: d.app_link.trim(), app_note: d.app_link.trim() ? d.app_note.trim() : "",
        featured: d.featured, published: d.published, updated_at: new Date().toISOString(),
        subtitle: d.subtitle.trim(), problem: d.problem.trim(), solution: d.solution.trim(), features: d.features.trim(), showcase_url,
      };
      st.info("Saving…");
      if (id) {
        const { error } = await db().from("projects").update(row).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { count } = await db().from("projects").select("id", { count: "exact", head: true });
        const { error } = await db().from("projects").insert({ ...row, sort: count || 0 });
        if (error) throw new Error(/duplicate key/i.test(error.message) ? "That URL slug is already used by another project." : error.message);
      }
      await refreshSite();
      router.push("/admin/projects");
    } catch (err: any) {
      st.fail(dbError(err.message || "Save failed"));
      setBusy(false);
    }
  }

  const previewProject: Project = {
    id: original?.id || 0, slug: slugify(d.slug || d.title) || "preview", title: d.title || "Project title",
    summary: d.summary || "Short description of the project.", repo: d.repo, live: d.live,
    image_url: preview || d.image_url, tags: splitList(d.tags), categories: splitList(d.categories), date: d.date,
    app_link: d.app_link, app_note: d.app_note, sort: 0,
  };

  if (!loaded) return <p className="d-empty">Loading…</p>;

  return (
    <form onSubmit={save}>
      <PageHead title={id ? "Edit project" : "New project"} sub={id ? `/projects/${d.slug}` : "Add a project to your portfolio."}>
        <Link href="/admin/projects" className="d-btn"><BackIcon /> All projects</Link>
      </PageHead>

      <section className="d-section">
        <h2>Source</h2>
        <p className="d-sub">The project page shows this repo&apos;s README (overview and pictures) automatically.</p>
        <div className="d-grid">
          <div className="d-field">
            <label htmlFor="pf-repo">GitHub repo</label>
            <input id="pf-repo" placeholder="e.g. Tayonx" maxLength={100} value={d.repo} onChange={set("repo")} />
          </div>
          <div className="d-field" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="d-btn" onClick={fillFromGitHub}>Fill from GitHub</button>
          </div>
        </div>
      </section>

      <section className="d-section">
        <h2>Basics</h2>
        <div className="d-grid">
          <div className="d-field"><label htmlFor="pf-title">Title</label><input id="pf-title" required maxLength={100} value={d.title} onChange={set("title")} /></div>
          <div className="d-field">
            <label htmlFor="pf-slug">URL slug</label>
            <input id="pf-slug" maxLength={60} value={d.slug} onChange={(e) => { setSlugTouched(true); setD({ ...d, slug: e.target.value }); }} />
            <span className="d-hint">yoursite/projects/{slugify(d.slug || d.title) || "…"}</span>
          </div>
          <div className="d-field d-full"><label htmlFor="pf-summary">Short description</label><textarea id="pf-summary" rows={3} maxLength={400} value={d.summary} onChange={set("summary")} /></div>
          <div className="d-field"><label htmlFor="pf-cats">Categories</label><input id="pf-cats" placeholder="Website, Mobile App" value={d.categories} onChange={set("categories")} /><span className="d-hint">Comma separated</span></div>
          <div className="d-field"><label htmlFor="pf-date">Date</label><input id="pf-date" placeholder="Jun 2026" maxLength={30} value={d.date} onChange={set("date")} /></div>
          <div className="d-field d-full"><label htmlFor="pf-tags">Tech stack</label><input id="pf-tags" placeholder="React, Node.js, MongoDB" value={d.tags} onChange={set("tags")} /><span className="d-hint">Comma separated</span></div>
        </div>
      </section>

      <section className="d-section">
        <h2>Story</h2>
        <p className="d-sub">Optional. Filled sections appear on the project page as Problem, Solution and Key features.</p>
        <div className="d-grid">
          <div className="d-field d-full"><label htmlFor="pf-subtitle">Subtitle</label><input id="pf-subtitle" maxLength={120} placeholder="AI career intelligence for job seekers" value={d.subtitle} onChange={set("subtitle")} /></div>
          <div className="d-field"><label htmlFor="pf-problem">The problem</label><textarea id="pf-problem" rows={6} maxLength={2000} value={d.problem} onChange={set("problem")} /><span className="d-hint">Empty line = new paragraph</span></div>
          <div className="d-field"><label htmlFor="pf-solution">The solution</label><textarea id="pf-solution" rows={6} maxLength={2000} value={d.solution} onChange={set("solution")} /><span className="d-hint">Empty line = new paragraph</span></div>
          <div className="d-field d-full"><label htmlFor="pf-features">Key features</label><textarea id="pf-features" rows={7} maxLength={3000} placeholder={"AI Skill Assessment: Adaptive quizzes check claimed skills…\nJob Intelligence: Explains every job match…"} value={d.features} onChange={set("features")} /><span className="d-hint">One feature per line, written as “Title: description”</span></div>
        </div>
      </section>

      <section className="d-section">
        <h2>Links</h2>
        <div className="d-grid">
          <div className="d-field d-full"><label htmlFor="pf-live">Website / live demo</label><input id="pf-live" type="url" placeholder="https://…" value={d.live} onChange={set("live")} /></div>
          <div className="d-field d-full"><label htmlFor="pf-app">Mobile app download link</label><input id="pf-app" type="url" placeholder="https://expo.dev/…" value={d.app_link} onChange={set("app_link")} /></div>
          {d.app_link && (
            <div className="d-field d-full"><label htmlFor="pf-appnote">How to install the app</label><textarea id="pf-appnote" rows={4} maxLength={1000} value={d.app_note} onChange={set("app_note")} /><span className="d-hint">One step per line</span></div>
          )}
        </div>
      </section>

      <section className="d-section">
        <h2>Cover image &amp; preview</h2>
        <div className="d-grid">
          <div className="d-field">
            <label htmlFor="pf-image">Cover image</label>
            <input id="pf-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f) setPreview(URL.createObjectURL(f));
            }} />
            <span className="d-hint">Resized and converted to WebP automatically.</span>
          </div>
          <div className="d-field">
            <label htmlFor="pf-showcase">Showcase image <span className="d-hint">(optional)</span></label>
            <input id="pf-showcase" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setShowcaseFile(f);
              if (f) setShowcasePreview(URL.createObjectURL(f));
            }} />
            <span className="d-hint">A full image (e.g. all app screens) shown uncropped at the top of the project page.</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {showcasePreview && <img src={showcasePreview} alt="" style={{ width: 160, borderRadius: 8, border: "1px solid var(--d-border)" }} />}
            {d.showcase_url && <button type="button" className="d-btn d-btn--sm d-btn--danger" style={{ alignSelf: "flex-start" }} onClick={() => { setD({ ...d, showcase_url: "" }); setShowcaseFile(null); setShowcasePreview(""); }}>Remove showcase image</button>}
          </div>
          <div className="d-field">
            <label>Card preview</label>
            <div style={{ maxWidth: 360 }} className="pcard-preview"><ProjectCard p={previewProject} index={0} /></div>
          </div>
        </div>
      </section>

      <section className="d-section">
        <h2>Visibility</h2>
        <div className="d-card" style={{ padding: "4px 16px" }}>
          <div className="d-switch-row">
            <div><b>Published</b><span>Visible on your site and at its own page.</span></div>
            <Switch checked={d.published} label="Published" onChange={(v) => setD({ ...d, published: v })} />
          </div>
          <div className="d-switch-row">
            <div><b>Featured</b><span>Shown in Featured Projects on the home page.</span></div>
            <Switch checked={d.featured} label="Featured" onChange={(v) => setD({ ...d, featured: v })} />
          </div>
        </div>
      </section>

      <div className="d-savebar">
        <StatusText status={st.status} />
        <Link href="/admin/projects" className="d-btn">Cancel</Link>
        <button type="submit" className="d-btn d-btn--primary" disabled={busy}>{busy ? "Saving…" : id ? "Save changes" : "Create project"}</button>
      </div>
    </form>
  );
}
