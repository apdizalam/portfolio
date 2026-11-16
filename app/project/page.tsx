import { permanentRedirect } from "next/navigation";

// Old links looked like /project?p=slug — send them to /projects/slug
export default async function OldProjectLink({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  permanentRedirect(p ? `/projects/${encodeURIComponent(p)}` : "/#projects");
}
