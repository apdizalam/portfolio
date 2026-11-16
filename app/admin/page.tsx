"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Message, Project } from "@/lib/types";
import { db } from "@/components/admin/helpers";
import { PageHead } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminShell";
import { PlusIcon } from "@/components/Icons";

export default function OverviewPage() {
  const { unread } = useAdmin();
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      db().from("projects").select("*").order("sort"),
      db().from("skills").select("id", { count: "exact", head: true }),
      db().from("messages").select("*").order("created_at", { ascending: false }).limit(5),
    ]).then(([p, s, m]) => {
      setProjects((p.data as Project[]) || []);
      setSkills(s.count || 0);
      setMessages((m.data as Message[]) || []);
      setLoaded(true);
    });
  }, []);

  const published = projects.filter((p) => p.published !== false).length;
  const featured = projects.filter((p) => p.published !== false && p.featured !== false).length;
  const views = projects.reduce((n, p) => n + (p.views || 0), 0);
  const top = [...projects].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Published", value: published },
    { label: "On home page", value: featured },
    { label: "Project views", value: views },
    { label: "Unread messages", value: unread },
    { label: "Skills", value: skills },
  ];

  return (
    <>
      <PageHead title="Overview" sub="A quick look at your portfolio.">
        <Link href="/admin/projects/new" className="d-btn d-btn--primary"><PlusIcon /> New project</Link>
      </PageHead>

      <div className="d-stats">
        {stats.map((s) => (
          <div key={s.label} className="d-card d-stat">
            <span>{s.label}</span>
            <b>{loaded ? s.value.toLocaleString() : "—"}</b>
          </div>
        ))}
      </div>

      <div className="d-grid">
        <section className="d-section">
          <h2>Latest messages</h2>
          <p className="d-sub">From your contact form.</p>
          <div className="d-card">
            {messages.length === 0 ? (
              <p className="d-empty">{loaded ? "No messages yet." : "Loading…"}</p>
            ) : (
              <ul className="d-list">
                {messages.map((m) => (
                  <li key={m.id}>
                    <div className="d-title"><b>{m.name}</b><span>{m.message}</span></div>
                    {!m.is_read && <span className="d-pill d-pill--new">New</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p style={{ marginTop: 10 }}><Link href="/admin/messages" className="d-btn d-btn--sm">Open inbox</Link></p>
        </section>

        <section className="d-section">
          <h2>Most viewed projects</h2>
          <p className="d-sub">Views count visits to each project page.</p>
          <div className="d-card">
            {top.length === 0 ? (
              <p className="d-empty">{loaded ? "No projects yet." : "Loading…"}</p>
            ) : (
              <ul className="d-list">
                {top.map((p) => (
                  <li key={p.id}>
                    <div className="d-title"><b>{p.title}</b><span>/{p.slug}</span></div>
                    <span className="d-pill">{(p.views || 0).toLocaleString()} views</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p style={{ marginTop: 10 }}><Link href="/admin/projects" className="d-btn d-btn--sm">Manage projects</Link></p>
        </section>
      </div>
    </>
  );
}
