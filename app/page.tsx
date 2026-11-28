import { getContent, getContributions, getFeaturedProjects, getPublishedProjects } from "@/lib/data";
import Link from "next/link";
import { GITHUB_USER, isHttps } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import RichText from "@/components/RichText";
import GitHubActivity from "@/components/GitHubActivity";
import SkillChip from "@/components/SkillChip";
import ProjectsGrid from "@/components/ProjectsGrid";
import ContactForm from "@/components/ContactForm";
import BottomNav from "@/components/BottomNav";
import ExperienceTimeline from "@/components/ExperienceTimeline";

// Rebuilt at most every 5 minutes, and immediately after admin edits.
export const revalidate = 60;

export async function generateMetadata() {
  const { profile } = await getContent();
  const full = [profile.name, profile.name_accent].filter(Boolean).join(" ");
  return { title: `${full} — Portfolio`, description: profile.title };
}

export default async function Home() {
  const { profile, education, experience, skills } = await getContent();
  const projects = await getFeaturedProjects();
  const allCount = (await getPublishedProjects()).length;
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
            <ExperienceTimeline education={education} experience={[]} />
          </Reveal>
        )}

        {experience.length > 0 && (
          <Reveal id="experience" className="section">
            <h2 className="section__title">Experience</h2>
            <ExperienceTimeline education={[]} experience={experience} />
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
          {allCount > projects.length && (
            <p style={{ marginTop: 16, textAlign: "center" }}>
              <Link href="/projects" className="btn btn--outline">View all {allCount} projects <span aria-hidden="true">→</span></Link>
            </p>
          )}
        </Reveal>

        <Reveal id="contact" className="section contact-section">
          <ContactForm linkedin={isHttps(profile.linkedin) ? profile.linkedin : ""} email={profile.public_email || ""} phone={profile.phone || ""} />
        </Reveal>

        <footer className="footer">© {new Date().getFullYear()} {[profile.name, profile.name_accent].filter(Boolean).join(" ")}</footer>
      </main>
      <BottomNav />
    </>
  );
}
