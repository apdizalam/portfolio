import type { Metadata } from "next";
import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/env";
import AdminApp from "@/components/admin/AdminApp";
import { ThemeToggle } from "@/components/BottomNav";
import { BackIcon, GridIcon, HomeIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Portfolio Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <>
      <main id="main">
        <Link href="/" className="back-link"><BackIcon /> Back to portfolio</Link>
        {supabaseConfigured ? (
          <AdminApp />
        ) : (
          <section className="card admin-card admin-login">
            <h1 className="section__title">Admin not connected</h1>
            <p className="hint">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect your Supabase project.</p>
          </section>
        )}
      </main>
      <nav className="bottomnav" aria-label="Quick navigation">
        <Link href="/" className="bottomnav__link"><HomeIcon /><span>Home</span></Link>
        <Link href="/#projects" className="bottomnav__link"><GridIcon /><span>Projects</span></Link>
        <ThemeToggle />
      </nav>
    </>
  );
}
