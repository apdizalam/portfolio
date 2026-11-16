"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { initials as makeInitials, isHttps, safeUrl } from "@/lib/utils";
import { db, dbError, refreshSite, uploadFile, uploadImage } from "@/components/admin/helpers";
import { PageHead, StatusText, useStatus } from "@/components/admin/ui";
import RichText from "@/components/RichText";

const EMPTY: Profile = {
  id: 1, name: "", name_accent: "", title: "", tagline: "", photo_url: "", about: "", github: "", linkedin: "",
  initials: "", location: "", location_url: "", public_email: "", phone: "", resume_url: "",
};

export default function ProfileAdminPage() {
  const [p, setP] = useState<Profile>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = useStatus();

  useEffect(() => {
    db().from("profile").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (error) st.fail(dbError(error.message));
      else if (data) setP({ ...EMPTY, ...(data as Profile) });
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setP({ ...p, [k]: e.target.value });
    setDirty(true);
  };

  async function save(next: Profile = p) {
    for (const [k, label] of [["github", "GitHub"], ["linkedin", "LinkedIn"], ["location_url", "Location"], ["resume_url", "Resume"]] as const) {
      const v = next[k] || "";
      if (v && !isHttps(v)) return st.fail(`${label} link must start with https://`);
    }
    if (next.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.public_email)) return st.fail("Public email doesn't look right.");
    setBusy(true);
    st.info("Saving…");
    const { error } = await db().from("profile").upsert({ ...next, id: 1, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return st.fail(dbError(error.message));
    setDirty(false);
    await refreshSite();
    st.ok("Saved. Your live site is updated.");
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    st.info("Uploading photo…");
    try {
      const url = await uploadImage(f, "profile", "photo", 800);
      const next = { ...p, photo_url: url };
      setP(next);
      await save(next);
    } catch (err: any) { st.fail(err.message || "Upload failed"); }
  }

  async function onResume(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return st.fail("Resume must be smaller than 8 MB.");
    st.info("Uploading resume…");
    try {
      const url = await uploadFile(f, "resume", "resume");
      const next = { ...p, resume_url: url };
      setP(next);
      await save(next);
    } catch (err: any) { st.fail(err.message || "Upload failed"); }
  }

  if (!loaded) return <p className="d-empty">Loading…</p>;
  const fullName = [p.name, p.name_accent].filter(Boolean).join(" ");

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      <PageHead title="Profile" sub="Your name, bio, photo, resume and social links." />

      <section className="d-section">
        <h2>Basics</h2>
        <div className="d-grid" style={{ marginTop: 12 }}>
          <div className="d-field"><label htmlFor="name">Name</label><input id="name" maxLength={80} value={p.name} onChange={set("name")} /></div>
          <div className="d-field"><label htmlFor="accent">Highlighted name</label><input id="accent" maxLength={60} value={p.name_accent} onChange={set("name_accent")} /><span className="d-hint">Shown in green after your name</span></div>
          <div className="d-field"><label htmlFor="initials">Initials</label><input id="initials" maxLength={4} placeholder={makeInitials(fullName)} value={p.initials || ""} onChange={set("initials")} /><span className="d-hint">Shown when there is no photo</span></div>
          <div className="d-field"><label htmlFor="title">Headline</label><input id="title" maxLength={120} value={p.title} onChange={set("title")} /></div>
          <div className="d-field"><label htmlFor="location">Location</label><input id="location" maxLength={80} value={p.location || ""} onChange={set("location")} /></div>
          <div className="d-field"><label htmlFor="location_url">Location link</label><input id="location_url" type="url" maxLength={300} placeholder="https://www.google.com/maps/…" value={p.location_url || ""} onChange={set("location_url")} /></div>
          <div className="d-field"><label htmlFor="public_email">Public email</label><input id="public_email" type="email" maxLength={150} value={p.public_email || ""} onChange={set("public_email")} /></div>
          <div className="d-field"><label htmlFor="phone">Phone</label><input id="phone" type="tel" maxLength={30} value={p.phone || ""} onChange={set("phone")} /></div>
        </div>
      </section>

      <section className="d-section">
        <h2>About</h2>
        <p className="d-sub">Wrap words in **double stars** for bold. Leave an empty line for a new paragraph.</p>
        <div className="d-grid">
          <div className="d-field"><label htmlFor="about" className="sr-only">About me</label><textarea id="about" className="d-mono" maxLength={3000} value={p.about} onChange={set("about")} /></div>
          <div className="d-preview" aria-label="Preview"><RichText text={p.about || "Your bio preview appears here."} /></div>
        </div>
      </section>

      <section className="d-section">
        <h2>Photo &amp; resume</h2>
        <div className="d-grid" style={{ marginTop: 12 }}>
          <div className="d-field">
            <label htmlFor="photo">Avatar</label>
            <div className="d-file">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {safeUrl(p.photo_url) ? <img className="d-avatar" src={safeUrl(p.photo_url)} alt="" /> : <div className="d-avatar" style={{ display: "grid", placeItems: "center", fontWeight: 700 }}>{p.initials || makeInitials(fullName)}</div>}
              <input id="photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} />
            </div>
            <span className="d-hint">Square photos look best. Saves right away.</span>
          </div>
          <div className="d-field">
            <label htmlFor="resume">Resume (PDF)</label>
            <div className="d-file">
              <input id="resume" type="file" accept="application/pdf" onChange={onResume} />
            </div>
            {p.resume_url ? (
              <span className="d-hint"><a href={p.resume_url} target="_blank" rel="noopener">View current resume</a> · <button type="button" className="d-btn d-btn--sm d-btn--danger" onClick={() => { const next = { ...p, resume_url: "" }; setP(next); save(next); }}>Remove</button></span>
            ) : (
              <span className="d-hint">Adds a “Resume” button next to your social links.</span>
            )}
          </div>
        </div>
      </section>

      <section className="d-section">
        <h2>Links &amp; note</h2>
        <div className="d-grid" style={{ marginTop: 12 }}>
          <div className="d-field"><label htmlFor="github">GitHub</label><input id="github" type="url" maxLength={300} value={p.github} onChange={set("github")} /></div>
          <div className="d-field"><label htmlFor="linkedin">LinkedIn</label><input id="linkedin" type="url" maxLength={300} value={p.linkedin} onChange={set("linkedin")} /></div>
          <div className="d-field d-full"><label htmlFor="tagline">Handwritten note</label><textarea id="tagline" rows={2} maxLength={80} value={p.tagline} onChange={set("tagline")} /><span className="d-hint">The note next to your photo. Enter = new line.</span></div>
        </div>
      </section>

      <div className="d-savebar">
        <StatusText status={st.status} />
        <button type="submit" className="d-btn d-btn--primary" disabled={busy || !dirty}>{busy ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}
