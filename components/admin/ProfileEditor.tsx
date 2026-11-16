"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { isHttps, safeUrl } from "@/lib/utils";
import { db, refreshSite, StatusLine, uploadImage, type Status } from "./helpers";

const EMPTY: Profile = { id: 1, name: "", name_accent: "", title: "", tagline: "", photo_url: "", about: "", github: "", linkedin: "" };

export default function ProfileEditor() {
  const [p, setP] = useState<Profile>(EMPTY);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db().from("profile").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (error) setStatus({ text: error.message, kind: "error" });
      else if (data) setP(data as Profile);
    });
  }, []);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });

  async function save(next = p) {
    for (const [k, label] of [["github", "GitHub"], ["linkedin", "LinkedIn"]] as const) {
      if (next[k] && !isHttps(next[k])) return setStatus({ text: `${label} link must start with https://`, kind: "error" });
    }
    setBusy(true);
    setStatus({ text: "Saving…" });
    const { error } = await db().from("profile").upsert({ ...next, id: 1, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setStatus({ text: error.message, kind: "error" });
    await refreshSite();
    setStatus({ text: "Saved! Your live site is updated.", kind: "success" });
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus({ text: "Uploading photo…" });
    try {
      const url = await uploadImage(file, "profile", "photo", 800);
      const next = { ...p, photo_url: url };
      setP(next);
      await save(next);
    } catch (err: any) {
      setStatus({ text: err.message || "Upload failed", kind: "error" });
    }
  }

  return (
    <form className="card admin-card" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <h2 className="section__title">Profile</h2>
      <div className="admin-row" style={{ alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="admin-avatar" src={safeUrl(p.photo_url) || "/assets/profile.jpg"} alt="Profile photo" />
        <div className="field">
          <label htmlFor="pr-photo">Profile photo</label>
          <input id="pr-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} />
          <span className="hint">A square photo looks best. It saves right away.</span>
        </div>
      </div>
      <div className="admin-grid">
        <div className="field"><label htmlFor="pr-name">Name</label><input id="pr-name" maxLength={80} value={p.name} onChange={set("name")} /></div>
        <div className="field"><label htmlFor="pr-accent">Highlighted name <span className="optional">(green)</span></label><input id="pr-accent" maxLength={60} value={p.name_accent} onChange={set("name_accent")} /></div>
        <div className="field field--full"><label htmlFor="pr-title">Job title</label><input id="pr-title" maxLength={120} value={p.title} onChange={set("title")} /></div>
        <div className="field field--full"><label htmlFor="pr-tagline">Handwritten note <span className="optional">(Enter = new line)</span></label><textarea id="pr-tagline" rows={2} maxLength={80} value={p.tagline} onChange={set("tagline")} /></div>
        <div className="field field--full">
          <label htmlFor="pr-about">About me</label>
          <textarea id="pr-about" rows={6} maxLength={3000} value={p.about} onChange={set("about")} />
          <span className="hint">Wrap words in **double stars** for bold. Empty line = new paragraph.</span>
        </div>
        <div className="field"><label htmlFor="pr-github">GitHub link</label><input id="pr-github" type="url" maxLength={300} value={p.github} onChange={set("github")} /></div>
        <div className="field"><label htmlFor="pr-linkedin">LinkedIn link</label><input id="pr-linkedin" type="url" maxLength={300} value={p.linkedin} onChange={set("linkedin")} /></div>
      </div>
      <div className="admin-row"><button className="btn btn--solid" type="submit" disabled={busy}>Save profile</button></div>
      <StatusLine status={status} />
    </form>
  );
}
