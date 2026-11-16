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
            <svg viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 18c12-14 32-16 50 2" /><path d="m46 21 7-1 1-7" /></svg>
          </p>
        )}
        <div className="hero__photo">
          {photo && photoOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`Portrait of ${full}`} onError={() => setPhotoOk(false)} />
          )}
          <span className="hero__initials" aria-hidden="true">{initials(full)}</span>
        </div>
      </div>
      <div className="hero__text">
        <h1 className="hero__name">
          {profile.name} {profile.name_accent && <span className="accent">{profile.name_accent}</span>}
        </h1>
        {profile.title && <p className="hero__title">{profile.title}</p>}
        <div className="socials">
          {isHttps(profile.github) && (
            <a href={profile.github} target="_blank" rel="noopener" aria-label="GitHub"><GithubIcon /></a>
          )}
          {isHttps(profile.linkedin) && (
            <a href={profile.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn"><LinkedinIcon /></a>
          )}
          <a href="#contact" aria-label="Send me a message"><MailIcon /></a>
        </div>
      </div>
    </div>
  );
}
