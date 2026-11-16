"use client";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import { GITHUB_USER, isHttps, safeUrl, slugify } from "@/lib/utils";
import { db, refreshSite, splitList, StatusLine, uploadImage, type Status } from "./helpers";

type Draft = {
  id?: number;
  slug: string;
  title: string;
  summary: string;
  repo: string;
  live: string;
  image_url: string;
  tags: string;
  categories: string;
  date: string;
  app_link: string;
  app_note: string;
  sort: number;
};

const toDraft = (p?: Project, sort = 0): Draft => ({
  id: p?.id,
  slug: p?.slug || "",
  title: p?.title || "",
  summary: p?.summary || "",
  repo: p?.repo || "",
  live: p?.live || "",
  image_url: p?.image_url || "",
  tags: (p?.tags || []).join(", "),
  categories: (p?.categories || []).join(", "),
  date: p?.date || "",
  app_link: p?.app_link || "",
  app_note: p?.app_note || "",
  sort: p?.sort ?? sort,
});

export default function ProjectsEditor() {
  const [list, setList] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db().from("projects").select("*").order("sort").order("id");
    if (error) setStatus({ text: error.message, kind: "error" });
    else setList((data as Project[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (p?: Project) => {
    setDraft(toDraft(p, list.length));
    setFile(null);
    setPreview(p ? safeUrl(p.image_url) : "");
    setStatus(null);
    setTimeout(() => document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));

  async function importFromGitHub() {
    if (!draft?.repo.trim()) return setStatus({ text: "Type the repo name first.", kind: "error" });
    const full = draft.repo.includes("/") ? draft.repo.trim() : `${GITHUB_USER}/${draft.repo.trim()}`;
    setStatus({ text: `Reading ${full} from GitHub…` });
    try {
      const [info, langs] = await Promise.all([
        fetch(`https://api.github.com/repos/${full}`).then((r) => { if (!r.ok) throw new Error("nf"); return r.json(); }),
        fetch(`https://api.github.com/repos/${full}/languages`).then((r) => (r.ok ? r.json() : {})),
      ]);
      setDraft((d) => d && ({
        ...d,
        repo: info.owner.login.toLowerCase() === GITHUB_USER.toLowerCase() ? info.name : info.full_name,
        title: d.title || info.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        summary: d.summary || info.description || "",
        live: d.live || info.homepage || "",
        tags: d.tags || [...(info.topics || []), ...Object.keys(langs)].slice(0, 6).join(", "),
        date: d.date || new Date(info.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      }));
      setStatus({ text: "Filled from GitHub. Add a cover image, then save.", kind: "success" });
    } catch (e: any) {
      setStatus({ text: e.message === "nf" ? "Couldn't find that public repo." : "GitHub is busy, try again in a minute.", kind: "error" });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) return setStatus({ text: "Please add a title.", kind: "error" });
    if (draft.live && !/^https?:\/\//i.test(draft.live)) return setStatus({ text: "The live link must start with https://", kind: "error" });
    if (draft.app_link && !isHttps(draft.app_link)) return setStatus({ text: "The app link must start with https://", kind: "error" });

    setBusy(true);
    try {
      let slug = draft.slug || slugify(draft.repo.split("/").pop() || draft.title) || "project";
      if (!draft.id) {
        let n = 2;
        const base = slug;
        while (list.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
      }
      let image_url = draft.image_url;
      if (file) {
        setStatus({ text: "Uploading image…" });
        image_url = await uploadImage(file, "projects", slug);
      }
      const row = {
        slug,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        repo: draft.repo.trim(),
        live: draft.live.trim(),
        image_url,
        tags: splitList(draft.tags),
        categories: splitList(draft.categories),
        date: draft.date.trim(),
        app_link: draft.app_link.trim(),
        app_note: draft.app_link.trim() ? draft.app_note.trim() : "",
        sort: draft.sort,
        updated_at: new Date().toISOString(),
      };
      setStatus({ text: "Saving…" });
      const { error } = draft.id
        ? await db().from("projects").update(row).eq("id", draft.id)
        : await db().from("projects").insert(row);
      if (error) throw new Error(error.message);
      await refreshSite();
      setDraft(null);
      await load();
      setStatus({ text: "Saved! Your live site is updated.", kind: "success" });
    } catch (err: any) {
      setStatus({ text: err.message || "Save failed", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.title}" from the portfolio?`)) return;
    const { error } = await db().from("projects").delete().eq("id", p.id);
    if (error) return setStatus({ text: error.message, kind: "error" });
    await refreshSite();
    await load();
    setStatus({ text: `Deleted "${p.title}".`, kind: "success" });
  }

  async function move(i: number, dir: -1 | 1) {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    const next = [...list];
    next[i] = b; next[i + dir] = a;
    setList(next);
    await Promise.all(next.map((p, idx) => db().from("projects").update({ sort: idx }).eq("id", p.id)));
    await refreshSite();
  }

  return (
    <section className="section">
      <div className="card admin-card">
        <h2 className="section__title">Projects</h2>
        <div className="admin-list">
          {list.length === 0 && <p className="hint">No projects yet.</p>}
          {list.map((p, i) => (
            <div key={p.id} className="admin-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeUrl(p.image_url) || "/assets/profile.jpg"} alt="" />
              <div className="admin-item__text"><strong>{p.title}</strong><span>{p.summary || p.repo}</span></div>
              <div className="admin-item__actions">
                {i > 0 && <button type="button" className="btn-plain" aria-label="Move up" onClick={() => move(i, -1)}>↑</button>}
                <button type="button" className="btn-plain" onClick={() => open(p)}>Edit</button>
                <button type="button" className="btn-plain btn-danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--outline" style={{ alignSelf: "flex-start" }} onClick={() => open()}>+ Add project</button>
        {!draft && <StatusLine status={status} />}
      </div>

      {draft && (
        <form id="project-form" className="card admin-card" style={{ marginTop: 16 }} onSubmit={save}>
          <h2 className="section__title">{draft.id ? "Edit project" : "Add project"}</h2>
          <div className="admin-row">
            <div className="field">
              <label htmlFor="pf-repo">GitHub repo <span className="optional">(name, e.g. Tayonx)</span></label>
              <input id="pf-repo" maxLength={100} value={draft.repo} onChange={set("repo")} />
            </div>
            <button type="button" className="btn-plain" onClick={importFromGitHub}>Fill from GitHub</button>
          </div>
          <p className="hint">The project page shows this repo&apos;s README (overview + pictures) automatically.</p>
          <div className="admin-grid">
            <div className="field field--full"><label htmlFor="pf-title">Title</label><input id="pf-title" required maxLength={100} value={draft.title} onChange={set("title")} /></div>
            <div className="field field--full"><label htmlFor="pf-summary">Short description</label><textarea id="pf-summary" rows={3} maxLength={400} value={draft.summary} onChange={set("summary")} /></div>
            <div className="field"><label htmlFor="pf-cats">Categories <span className="optional">(comma separated)</span></label><input id="pf-cats" placeholder="Website, Mobile App" value={draft.categories} onChange={set("categories")} /></div>
            <div className="field"><label htmlFor="pf-date">Date</label><input id="pf-date" placeholder="Jun 2026" maxLength={30} value={draft.date} onChange={set("date")} /></div>
            <div className="field"><label htmlFor="pf-live">Live demo link</label><input id="pf-live" type="url" placeholder="https://…" value={draft.live} onChange={set("live")} /></div>
            <div className="field"><label htmlFor="pf-tags">Technologies <span className="optional">(comma separated)</span></label><input id="pf-tags" placeholder="React, Node.js" value={draft.tags} onChange={set("tags")} /></div>
            <div className="field field--full"><label htmlFor="pf-app">Mobile app download link <span className="optional">(optional)</span></label><input id="pf-app" type="url" placeholder="https://expo.dev/…" value={draft.app_link} onChange={set("app_link")} /></div>
            <div className="field field--full"><label htmlFor="pf-appnote">How to install the app <span className="optional">(one step per line)</span></label><textarea id="pf-appnote" rows={4} maxLength={1000} value={draft.app_note} onChange={set("app_note")} /></div>
            <div className="field field--full">
              <label htmlFor="pf-image">Cover image</label>
              <input id="pf-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f) setPreview(URL.createObjectURL(f));
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview && <img className="admin-preview" src={preview} alt="" />}
            </div>
          </div>
          <div className="admin-row">
            <button type="submit" className="btn btn--solid" disabled={busy}>Save project</button>
            <button type="button" className="btn-plain" onClick={() => setDraft(null)}>Cancel</button>
          </div>
          <StatusLine status={status} />
        </form>
      )}
    </section>
  );
}
