import Link from "next/link";
import { getPublishedProjects } from "@/lib/data";
import ProjectsGrid from "@/components/ProjectsGrid";
import BottomNav from "@/components/BottomNav";
import { BackIcon } from "@/components/Icons";

export const revalidate = 300;
export const metadata = { title: "Projects — Abdisalam Mohamed Muhumed", description: "All projects by Abdisalam Mohamed Muhumed." };

export default async function AllProjectsPage() {
  const projects = await getPublishedProjects();
  return (
    <>
      <main id="main">
        <Link href="/" className="back-link"><BackIcon /> Back home</Link>
        <section id="projects" className="section">
          <h1 className="section__title">All projects</h1>
          <ProjectsGrid projects={projects} />
        </section>
      </main>
      <BottomNav />
    </>
  );
}
