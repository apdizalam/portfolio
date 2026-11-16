import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function NotFound() {
  return (
    <>
      <main id="main">
        <section className="pd-hero">
          <h1 className="pd-title">Page not found</h1>
          <p className="pd-summary">This page doesn&apos;t exist.</p>
          <div className="pd-actions"><Link className="btn btn--solid" href="/">Back home</Link></div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
