"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { db, StatusLine, type Status } from "./helpers";
import ProfileEditor from "./ProfileEditor";
import ProjectsEditor from "./ProjectsEditor";
import SkillsEditor from "./SkillsEditor";
import EducationEditor from "./EducationEditor";
import MessagesInbox from "./MessagesInbox";
import { BackIcon } from "../Icons";

type Tab = "profile" | "projects" | "skills" | "education" | "messages";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "messages", label: "Messages" },
];

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");
  const [unread, setUnread] = useState(0);

  const checkAdmin = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) { setIsAdmin(false); setChecking(false); return; }
    const { data } = await db().rpc("is_admin");
    setIsAdmin(data === true);
    setChecking(false);
  }, []);

  useEffect(() => {
    db().auth.getSession().then(({ data }) => checkAdmin(data.session));
    const { data: sub } = db().auth.onAuthStateChange((_e, s) => checkAdmin(s));
    return () => sub.subscription.unsubscribe();
  }, [checkAdmin]);

  const loadUnread = useCallback(async () => {
    const { count } = await db().from("messages").select("id", { count: "exact", head: true }).eq("is_read", false);
    setUnread(count || 0);
  }, []);
  useEffect(() => { if (isAdmin) loadUnread(); }, [isAdmin, loadUnread]);

  if (checking) return <p className="readme__status">Loading…</p>;

  if (!session) return <LoginForm />;

  if (!isAdmin) {
    return (
      <section className="card admin-card admin-login">
        <h1 className="section__title">No access</h1>
        <p className="hint">You&apos;re signed in as <b>{session.user.email}</b>, but this email isn&apos;t an admin.</p>
        <button className="btn btn--outline" onClick={() => db().auth.signOut()}>Sign out</button>
      </section>
    );
  }

  return (
    <>
      <div className="admin-head">
        <h1>Portfolio admin</h1>
        <div className="admin-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === "messages" && unread > 0 && <span className="badge-count">{unread}</span>}
            </button>
          ))}
          <button type="button" className="btn-plain" onClick={() => db().auth.signOut()}>Log out</button>
        </div>
      </div>
      <p className="notice">Changes are saved straight to your Supabase database and appear on the live site within a few seconds.</p>
      {tab === "profile" && <ProfileEditor />}
      {tab === "projects" && <ProjectsEditor />}
      {tab === "skills" && <SkillsEditor />}
      {tab === "education" && <EducationEditor />}
      {tab === "messages" && <MessagesInbox onChange={loadUnread} />}
    </>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="card admin-card admin-login">
      <h1 className="section__title">Admin login</h1>
      <p className="hint">Only you can change the portfolio.</p>
      <form
        className="admin-list"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setStatus({ text: "Checking…" });
          const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
          setBusy(false);
          setStatus(error ? { text: error.message === "Invalid login credentials" ? "Wrong email or password." : error.message, kind: "error" } : null);
        }}
      >
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn--solid" type="submit" disabled={busy}>Log in</button>
        <StatusLine status={status} />
      </form>
    </section>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main">
      <Link href="/" className="back-link"><BackIcon /> Back to portfolio</Link>
      {children}
    </main>
  );
}
