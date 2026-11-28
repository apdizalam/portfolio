"use client";
import { useState } from "react";
import type { Education, Experience } from "@/lib/types";
import { buildTimeline } from "@/lib/timeline";
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

/**
 * The organisation's real logo when one has been added. Without one (or if the image fails),
 * a neutral icon is shown in the normal dark style, so it never looks like an organisation's logo.
 */
function OrgLogo({ src, name, kind }: { src: string; name: string; kind: "education" | "experience" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <div className="timeline__icon timeline__icon--logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${name} logo`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="timeline__icon timeline__icon--fallback" aria-hidden="true">
      {kind === "education" ? <CapIcon /> : <BriefcaseIcon />}
    </div>
  );
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

// Education first, then Experience (order decided in lib/timeline.ts).
export default function ExperienceTimeline({ experience, education }: { experience: Experience[]; education: Education[] }) {
  return (
    <ol className="timeline xp">
      {buildTimeline(education, experience).map((item) =>
        item.kind === "education" ? (
          <li key={item.key} className="timeline__item" data-kind="education">
            <OrgLogo src={item.logo} name={item.data.school} kind="education" />
            <div className="timeline__body">
              <h3>{item.data.school}</h3>
              {(item.data.dates || item.data.place) && (
                <p className="meta">{[item.data.dates, item.data.place].filter(Boolean).join(" • ")}</p>
              )}
              {item.data.degree && <p>{item.data.degree}</p>}
            </div>
          </li>
        ) : (
          <li key={item.key} className="timeline__item" data-kind="experience">
            <OrgLogo src={item.logo} name={item.data.company || item.data.role} kind="experience" />
            <div className="timeline__body">
              <h3>{item.data.role}</h3>
              {(item.data.company || item.data.employment_type) && (
                <p className="xp__company">{[item.data.company, item.data.employment_type].filter(Boolean).join(" · ")}</p>
              )}
              {(item.data.period || item.data.location || item.data.work_mode) && (
                <p className="meta">
                  {item.data.period}
                  {item.data.period && (item.data.location || item.data.work_mode) && " • "}
                  {[item.data.location, item.data.work_mode].filter(Boolean).join(" · ")}
                </p>
              )}
              {item.data.description && <Description text={item.data.description} />}
              {item.data.skills?.length > 0 && <p className="xp__skills"><GemIcon /> {item.data.skills.join(", ")}</p>}
            </div>
          </li>
        ),
      )}
    </ol>
  );
}
