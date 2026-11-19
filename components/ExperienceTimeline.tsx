"use client";
import { useState } from "react";
import type { Education, Experience } from "@/lib/types";
import { safeUrl } from "@/lib/utils";
import { CapIcon } from "./Icons";

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />
  </svg>
);
const GemIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z" /><path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" />
  </svg>
);

function Logo({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  const url = safeUrl(src);
  if (!url || !ok) return <BriefcaseIcon />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setOk(false)} />;
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 170;
  return (
    <p className="xp__desc">
      {long && !open ? `${text.slice(0, 170).trimEnd()}…` : text}{" "}
      {long && (
        <button type="button" className="xp__more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "less" : "more"}
        </button>
      )}
    </p>
  );
}

export default function ExperienceTimeline({ experience, education }: { experience: Experience[]; education: Education[] }) {
  return (
    <ol className="timeline xp">
      {experience.map((x) => (
        <li key={`x${x.id}`} className="timeline__item">
          <div className={`timeline__icon${x.logo_url ? " timeline__icon--logo" : ""}`}><Logo src={x.logo_url} /></div>
          <div className="timeline__body">
            <h3>{x.role}</h3>
            {(x.company || x.employment_type) && (
              <p className="xp__company">{[x.company, x.employment_type].filter(Boolean).join(" · ")}</p>
            )}
            {(x.period || x.location || x.work_mode) && (
              <p className="meta">
                {x.period}
                {x.period && (x.location || x.work_mode) && " • "}
                {[x.location, x.work_mode].filter(Boolean).join(" · ")}
              </p>
            )}
            {x.description && <Description text={x.description} />}
            {x.skills?.length > 0 && (
              <p className="xp__skills"><GemIcon /> {x.skills.join(", ")}</p>
            )}
          </div>
        </li>
      ))}
      {education.map((e) => (
        <li key={`e${e.id}`} className="timeline__item">
          <div className="timeline__icon"><CapIcon /></div>
          <div className="timeline__body">
            <h3>{e.school}</h3>
            {(e.dates || e.place) && <p className="meta">{[e.dates, e.place].filter(Boolean).join(" • ")}</p>}
            {e.degree && <p>{e.degree}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
