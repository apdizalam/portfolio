import { getContent, getContributions } from "@/lib/data";
import { GITHUB_USER, isHttps } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import RichText from "@/components/RichText";
import GitHubActivity from "@/components/GitHubActivity";
import SkillChip from "@/components/SkillChip";
import ProjectsGrid from "@/components/ProjectsGrid";
import ContactForm from "@/components/ContactForm";
import BottomNav from "@/components/BottomNav";
import { CapIcon } from "@/components/Icons";

// Rebuilt at most every 5 minutes, and immediately after admin edits.
export const revalidate = 300;

export async function generateMetadata() {
  const { profile } = await getContent();
  const full = [profile.name, profile.name_accent].filter(Boolean).join(" ");
  return { title: `${full} — Portfolio`, description: profile.title };
}

export default async function Home() {
  const { profile, education, skills, projects } = await getContent();
  const contributions = await getContributions(GITHUB_USER);

  return (
    <>
      <main id="main">
        <Reveal id="home"><Hero profile={profile} /></Reveal>

        {profile.about && (
          <Reveal id="about" className="section">
            <h2 className="section__title">About Me</h2>
            <div className="about__text"><RichText text={profile.about} /></div>
          </Reveal>
        )}

        <Reveal className="section" aria-label="GitHub activity">
          <GitHubActivity data={contributions} profileUrl={isHttps(profile.github) ? profile.github : `https://github.com/${GITHUB_USER}`} />
        </Reveal>

        {education.length > 0 && (
          <Reveal id="education" className="section">
            <h2 className="section__title">Education</h2>
            <ol className="timeline">
              {education.map((e) => (
                <li key={e.id} className="timeline__item">
                  <div className="timeline__icon"><CapIcon /></div>
                  <div className="timeline__body">
                    <h3>{e.school}</h3>
                    {(e.dates || e.place) && <p className="meta">{[e.dates, e.place].filter(Boolean).join(" • ")}</p>}
                    {e.degree && <p>{e.degree}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        <Reveal id="skills" className="section">
          <h2 className="section__title">Skills</h2>
          <ul className="chips">
            {skills.map((s) => <SkillChip key={s.id} name={s.name} icon={s.icon} />)}
          </ul>
        </Reveal>

        <Reveal id="projects" className="section">
          <h2 className="section__title">Featured Projects</h2>
          <ProjectsGrid projects={projects} />
        </Reveal>

        <Reveal id="contact" className="section contact-section">
          <ContactForm linkedin={isHttps(profile.linkedin) ? profile.linkedin : ""} />
        </Reveal>

        <footer className="footer">© {new Date().getFullYear()} {[profile.name, profile.name_accent].filter(Boolean).join(" ")}</footer>
      </main>
      <BottomNav />
    </>
  );
}
