"use client";
import { useCallback, useEffect, useState } from "react";
import type { Experience } from "@/lib/types";
import { safeUrl } from "@/lib/utils";
import { db, dbError, refreshSite, splitList, uploadImage } from "@/components/admin/helpers";
import { PageHead, StatusText, useStatus } from "@/components/admin/ui";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";

type Draft = {
  id?: number; role: string; company: string; employment_type: string; period: string;
  location: string; work_mode: string; description: string; skills: string; logo_url: string;
};
const EMPTY: Draft = {
  role: "", company: "", employment_type: "", period: "", location: "", work_mode: "On-site",
  description: "", skills: "", logo_url: "",
};
const TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Freelance", "Volunteer", "Self-employed"];
const MODES = ["On-site", "Remote", "Hybrid"];

export default function ExperienceAdminPage() {
  const [list, setList] = useState<Experience[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const st = useStatus();

  const load = useCallback(async () => {
    const { data, error } = await db().from("experience").select("*").order("sort").order("id");
    if (error) {
      st.fail(/experience/.test(error.message) && /(does not exist|could not find)/i.test(error.message)
        ? "Your database needs the Experience update. Run supabase/migrations/003_experience.sql in Supabase → SQL Editor."
        : dbError(error.message));
    } else setList((data as Experience[]) || []);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (x?: Experience) => {
    st.clear();
    setDraft(x ? { ...x, skills: (x.skills || []).join(", ") } : { ...EMPTY });
    setTimeout(() => document.getElementById("xp-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !draft) return;
    st.info("Uploading logo…");
    try {
      const url = await uploadImage(f, "projects", "logo", 200);
      setDraft({ ...draft, logo_url: url });
      st.ok("Logo uploaded. Save to keep it.");
    } catch (err: any) { st.fail(err.message || "Upload failed"); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.role.trim()) return st.fail("Please add a role / job title.");
    setBusy(true);
    st.info("Saving…");
    const row = {
      role: draft.role.trim(), company: draft.company.trim(), employment_type: draft.employment_type.trim(),
      period: draft.period.trim(), location: draft.location.trim(), work_mode: draft.work_mode.trim(),
      description: draft.description.trim(), skills: splitList(draft.skills), logo_url: draft.logo_url,
      updated_at: new Date().toISOString(),
    };
    const { error } = draft.id
      ? await db().from("experience").update(row).eq("id", draft.id)
      : await db().from("experience").insert({ ...row, sort: list.length });
    setBusy(false);
    if (error) return st.fail(dbError(error.message));
    setDraft(null);
    await load();
    await refreshSite();
    st.ok("Saved. Your live site is updated.");
  }

  async function remove(x: Experience) {
    if (!confirm(`Delete "${x.role}"? This can't be undone.`)) return;
    const { error } = await db().from("experience").delete().eq("id", x.id);
    if (error) return st.fail(dbError(error.message));
    setList((l) => l.filter((y) => y.id !== x.id));
    await refreshSite();
    st.ok(`Deleted "${x.role}".`);
  }

  async function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    const res = await Promise.all(next.map((x, k) => db().from("experience").update({ sort: k }).eq("id", x.id)));
    const err = res.find((r) => r.error)?.error;
    if (err) return st.fail(dbError(err.message));
    await refreshSite();
  }

  return (
    <>
      <PageHead title="Experience" sub="Jobs, internships and volunteering shown in your Experience & Education section.">
        <button className="d-btn d-btn--primary" onClick={() => open()}><PlusIcon /> Add experience</button>
      </PageHead>

      <div className="d-card">
        {!loaded && <p className="d-empty">Loading…</p>}
        {loaded && list.length === 0 && <p className="d-empty">No experience yet. Click “Add experience”.</p>}
        <ul className="d-list">
          {list.map((x, i) => (
            <li key={x.id}>
              <div className="d-row" style={{ minWidth: 0, flexWrap: "nowrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {safeUrl(x.logo_url) ? <img src={safeUrl(x.logo_url)} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: "#fff" }} /> : null}
                <div className="d-title">
                  <b>{x.role}</b>
                  <span>{[x.company, x.employment_type].filter(Boolean).join(" · ")}{x.period ? ` — ${x.period}` : ""}</span>
                </div>
              </div>
              <div className="actions" style={{ whiteSpace: "nowrap" }}>
                <button className="d-icon-btn" aria-label={`Move ${x.role} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /></button>
                <button className="d-icon-btn" aria-label={`Move ${x.role} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /></button>
                <button className="d-icon-btn" aria-label={`Edit ${x.role}`} onClick={() => open(x)}><PencilIcon /></button>
                <button className="d-icon-btn d-icon-btn--danger" aria-label={`Delete ${x.role}`} onClick={() => remove(x)}><TrashIcon /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!draft && <p style={{ marginTop: 12 }}><StatusText status={st.status} /></p>}

      {draft && (
        <form id="xp-form" onSubmit={save} style={{ marginTop: 32 }}>
          <section className="d-section">
            <h2>{draft.id ? "Edit experience" : "New experience"}</h2>
            <div className="d-grid" style={{ marginTop: 12 }}>
              <div className="d-field"><label htmlFor="xp-role">Role / title</label><input id="xp-role" required maxLength={120} placeholder="ICT Intern" value={draft.role} onChange={set("role")} /></div>
              <div className="d-field"><label htmlFor="xp-company">Company / organisation</label><input id="xp-company" maxLength={160} value={draft.company} onChange={set("company")} /></div>
              <div className="d-field">
                <label htmlFor="xp-type">Employment type</label>
                <input id="xp-type" list="xp-types" maxLength={40} placeholder="Part-time" value={draft.employment_type} onChange={set("employment_type")} />
                <datalist id="xp-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="d-field"><label htmlFor="xp-period">Dates</label><input id="xp-period" maxLength={60} placeholder="Jul 2025 – Sep 2025 · 3 mos" value={draft.period} onChange={set("period")} /></div>
              <div className="d-field"><label htmlFor="xp-location">Location</label><input id="xp-location" maxLength={80} placeholder="Borama, Somaliland" value={draft.location} onChange={set("location")} /></div>
              <div className="d-field">
                <label htmlFor="xp-mode">Work mode</label>
                <select id="xp-mode" value={draft.work_mode} onChange={set("work_mode")}>
                  <option value="">—</option>
                  {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="d-field d-full"><label htmlFor="xp-desc">Description</label><textarea id="xp-desc" rows={4} maxLength={2000} value={draft.description} onChange={set("description")} /><span className="d-hint">Long descriptions get a “more” link on the site.</span></div>
              <div className="d-field d-full"><label htmlFor="xp-skills">Skills</label><input id="xp-skills" maxLength={300} placeholder="Data Collection, Data Entry" value={draft.skills} onChange={set("skills")} /><span className="d-hint">Comma separated</span></div>
              <div className="d-field d-full">
                <label htmlFor="xp-logo">Company logo <span className="d-hint">(optional)</span></label>
                <div className="d-file">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {safeUrl(draft.logo_url) && <img src={safeUrl(draft.logo_url)} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid var(--d-border)" }} />}
                  <input id="xp-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} />
                  {draft.logo_url && <button type="button" className="d-btn d-btn--sm d-btn--danger" onClick={() => setDraft({ ...draft, logo_url: "" })}>Remove logo</button>}
                </div>
              </div>
            </div>
          </section>
          <div className="d-savebar">
            <StatusText status={st.status} />
            <button type="button" className="d-btn" onClick={() => setDraft(null)}>Cancel</button>
            <button type="submit" className="d-btn d-btn--primary" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save changes" : "Add experience"}</button>
          </div>
        </form>
      )}
    </>
  );
}
