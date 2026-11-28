"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { db } from "./helpers";
import {
  DashEducationIcon, DashExperienceIcon, DashInboxIcon, DashOverviewIcon, DashProfileIcon, DashProjectsIcon,
  DashSkillsIcon, ExternalIcon, LogoutIcon, MoonIcon, SunIcon,
} from "../Icons";

type Ctx = { email: string; unread: number; refreshUnread: () => void };
const AdminCtx = createContext<Ctx>({ email: "", unread: 0, refreshUnread: () => {} });
export const useAdmin = () => useContext(AdminCtx);

const NAV = [
  { href: "/admin", label: "Overview", Icon: DashOverviewIcon },
  { href: "/admin/profile", label: "Profile", Icon: DashProfileIcon },
  { href: "/admin/skills", label: "Skills", Icon: DashSkillsIcon },
  { href: "/admin/education", label: "Education", Icon: DashEducationIcon },
  { href: "/admin/experience", label: "Experience", Icon: DashExperienceIcon },
  { href: "/admin/projects", label: "Projects", Icon: DashProjectsIcon },
  { href: "/admin/messages", label: "Messages", Icon: DashInboxIcon },
];

const DEFAULT_PHOTO = "/assets/profile/photo-mwjbzfjf.webp";

/* Same backdrop as the portfolio: two blurred emerald glows + dotted pattern */
function Backdrop() {
  return (
    <div className="dash-bg" aria-hidden="true">
      <div className="dash-bg__glow dash-bg__glow--left" />
      <div className="dash-bg__glow dash-bg__glow--right" />
      <div className="dash-bg__dots" />
    </div>
  );
}

function useAdminTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    try { if (localStorage.getItem("admin-theme") === "light") setTheme("light"); } catch {}
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("admin-theme", next); } catch {}
  };
  return { theme, toggle };
}

export default function AdminShell({ children, configured }: { children: React.ReactNode; configured: boolean }) {
  const pathname = usePathname();
  const { theme, toggle } = useAdminTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<"loading" | "out" | "denied" | "ok">("loading");
  const [unread, setUnread] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  useEffect(() => {
    const onRefresh = (e: Event) => setRefreshFailed(!(e as CustomEvent<{ ok: boolean }>).detail?.ok);
    window.addEventListener("site-refresh", onRefresh);
    return () => window.removeEventListener("site-refresh", onRefresh);
  }, []);

  const check = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) return setState("out");
    const { data } = await db().rpc("is_admin");
    setState(data === true ? "ok" : "denied");
  }, []);

  useEffect(() => {
    if (!configured) return;
    db().auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = db().auth.onAuthStateChange((_e, s) => check(s));
    return () => sub.subscription.unsubscribe();
  }, [check, configured]);

  const refreshUnread = useCallback(async () => {
    const { count } = await db().from("messages").select("id", { count: "exact", head: true }).eq("is_read", false);
    setUnread(count || 0);
  }, []);
  useEffect(() => { if (state === "ok") refreshUnread(); }, [state, refreshUnread]);

  const [me, setMe] = useState({ name: "Abdisalam Mohamed", photo: DEFAULT_PHOTO });
  useEffect(() => {
    if (state !== "ok") return;
    db().from("profile").select("name, photo_url").eq("id", 1).maybeSingle().then(({ data }) => {
      if (!data) return;
      setMe({ name: data.name || "Abdisalam Mohamed", photo: data.photo_url || DEFAULT_PHOTO });
    });
  }, [state]);

  if (!configured) {
    return <LoginFrame theme={theme}><h1>Admin not connected</h1><p>Add your Supabase URL and publishable key to the environment variables.</p></LoginFrame>;
  }
  if (state === "loading") return <LoginFrame theme={theme}><p>Loading…</p></LoginFrame>;
  if (state === "out") return <LoginFrame theme={theme}><LoginForm /></LoginFrame>;
  if (state === "denied") {
    return (
      <LoginFrame theme={theme}>
        <h1>No access</h1>
        <p>You&apos;re signed in as <b>{session?.user.email}</b>, but this email isn&apos;t an admin.</p>
        <button className="d-btn d-btn--block" onClick={() => db().auth.signOut()}>Sign out</button>
      </LoginFrame>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <AdminCtx.Provider value={{ email: session?.user.email || "", unread, refreshUnread }}>
      <div className="dash" data-admin-theme={theme}>
        <Backdrop />
        <aside className="dash-side">
          <div className="dash-brand">
            <img className="dash-brand__photo" src={me.photo} alt="" />
            <div className="dash-brand__text">
              <b>{me.name}</b>
              <span>Portfolio admin</span>
            </div>
          </div>
          <nav className="dash-nav" aria-label="Admin">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={isActive(href) ? "is-active" : ""} aria-current={isActive(href) ? "page" : undefined}>
                <Icon /><span>{label}</span>
                {href === "/admin/messages" && unread > 0 && <span className="dash-count" aria-label={`${unread} unread`}>{unread}</span>}
              </Link>
            ))}
            <a href="/" target="_blank" rel="noopener"><ExternalIcon /><span>View site</span></a>
          </nav>
          <div className="dash-user">
            <div className="dash-user__email" title={session?.user.email}>{session?.user.email}</div>
            <div className="dash-user__row">
              <button className="d-btn" style={{ flex: 1 }} onClick={() => db().auth.signOut()}><LogoutIcon /> <span>Sign out</span></button>
              <button className="d-icon-btn d-icon-btn--box" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </button>
            </div>
          </div>
        </aside>
        <main className="dash-main" id="main">
          <div className="dash-page">
            {refreshFailed && (
              <p className="d-notice" role="status">
                Your change is saved, but the public site couldn&apos;t be refreshed right away. It will update automatically within a minute.
                <button type="button" className="d-icon-btn" aria-label="Dismiss" onClick={() => setRefreshFailed(false)}>×</button>
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </AdminCtx.Provider>
  );
}

function LoginFrame({ children, theme }: { children: React.ReactNode; theme: string }) {
  return (
    <div className="dash dash-login" data-admin-theme={theme} style={{ display: "grid" }}>
      <Backdrop />
      <div className="d-card">
        <img className="dash-login__photo" src={DEFAULT_PHOTO} alt="" />
        {children}
        <Link href="/" className="d-back">← Back to portfolio</Link>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1>Portfolio admin</h1>
      <p>Sign in to manage your portfolio.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
          setBusy(false);
          if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
        }}
      >
        <div className="d-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="d-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="d-btn d-btn--primary d-btn--block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="d-status is-error" role="alert" style={{ margin: 0 }}>{error}</p>
      </form>
    </>
  );
}
