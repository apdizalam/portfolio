"use client";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { initials, safeUrl, isHttps } from "@/lib/utils";
import { GithubIcon, LinkedinIcon, MailIcon } from "./Icons";

export default function Hero({ profile }: { profile: Profile }) {
  const [photoOk, setPhotoOk] = useState(true);
  const full = [profile.name, profile.name_accent].filter(Boolean).join(" ");
  const photo = safeUrl(profile.photo_url);

  return (
    <div className="hero">
      <div className="hero__media">
        {profile.tagline && (
          <p className="hero__note" aria-hidden="true">
            {profile.tagline.split("\n").map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
            <svg className="hero__arrow" viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path className="hero__arrow-line" pathLength={1} d="M3 18c12-14 32-16 50 2" /><path className="hero__arrow-head" pathLength={1} d="m46 21 7-1 1-7" /></svg>
          </p>
        )}
        <div className="hero__photo">
          {photo && photoOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`Portrait of ${full}`} onError={() => setPhotoOk(false)} />
          )}
          <span className="hero__initials" aria-hidden="true">{profile.initials || initials(full)}</span>
        </div>
      </div>
      <div className="hero__text">
        <h1 className="hero__name">
          {profile.name} {profile.name_accent && <span className="accent">{profile.name_accent}</span>}
        </h1>
        {profile.title && <p className="hero__title">{profile.title}</p>}
        {profile.location && (
          <p className="hero__location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
            {isHttps(profile.location_url) ? <a href={profile.location_url} target="_blank" rel="noopener">{profile.location}</a> : profile.location}
          </p>
        )}
        <div className="socials">
          {isHttps(profile.github) && (
            <a href={profile.github} target="_blank" rel="noopener" aria-label="GitHub"><GithubIcon /></a>
          )}
          {isHttps(profile.linkedin) && (
            <a href={profile.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn"><LinkedinIcon /></a>
          )}
          <a href="#contact" aria-label="Send me a message"><MailIcon /></a>
          {isHttps(profile.resume_url) && (
            <a href={profile.resume_url} target="_blank" rel="noopener" className="socials__resume">Resume</a>
          )}
        </div>
      </div>
    </div>
  );
}
