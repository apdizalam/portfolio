"use client";
import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import { db, dbError } from "@/components/admin/helpers";
import { PageHead, StatusText, useStatus } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminShell";
import { TrashIcon } from "@/components/Icons";

export default function MessagesAdminPage() {
  const { refreshUnread } = useAdmin();
  const [list, setList] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const st = useStatus();

  const load = useCallback(async () => {
    const { data, error } = await db().from("messages").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) st.fail(dbError(error.message));
    else setList((data as Message[]) || []);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRead(m: Message, is_read: boolean) {
    const { error } = await db().from("messages").update({ is_read }).eq("id", m.id);
    if (error) return st.fail(dbError(error.message));
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, is_read } : x)));
    refreshUnread();
  }

  async function markAllRead() {
    const { error } = await db().from("messages").update({ is_read: true }).eq("is_read", false);
    if (error) return st.fail(dbError(error.message));
    setList((l) => l.map((x) => ({ ...x, is_read: true })));
    refreshUnread();
    st.ok("All messages marked as read.");
  }

  async function remove(m: Message) {
    if (!confirm(`Delete the message from ${m.name}? This can't be undone.`)) return;
    const { error } = await db().from("messages").delete().eq("id", m.id);
    if (error) return st.fail(dbError(error.message));
    setList((l) => l.filter((x) => x.id !== m.id));
    refreshUnread();
  }

  const shown = filter === "unread" ? list.filter((m) => !m.is_read) : list;
  const unreadCount = list.filter((m) => !m.is_read).length;

  return (
    <>
      <PageHead title="Messages" sub="Everything sent through your contact form. Each message is also emailed to you.">
        <div className="d-row">
          <button className={`d-btn d-btn--sm${filter === "all" ? " d-btn--primary" : ""}`} onClick={() => setFilter("all")}>All ({list.length})</button>
          <button className={`d-btn d-btn--sm${filter === "unread" ? " d-btn--primary" : ""}`} onClick={() => setFilter("unread")}>Unread ({unreadCount})</button>
          {unreadCount > 0 && <button className="d-btn d-btn--sm" onClick={markAllRead}>Mark all read</button>}
        </div>
      </PageHead>
      <div className="d-card">
        {!loaded && <p className="d-empty">Loading…</p>}
        {loaded && shown.length === 0 && <p className="d-empty">{filter === "unread" ? "No unread messages." : "No messages yet."}</p>}
        {shown.map((m) => (
          <article key={m.id} className={`d-msg${m.is_read ? "" : " is-unread"}`} onClick={() => { if (!m.is_read) setRead(m, true); }}>
            <div className="d-msg__head">
              <div className="d-title">
                <b>{m.name} {!m.is_read && <span className="d-pill d-pill--new">New</span>}</b>
                <span><a href={`mailto:${m.email}`}>{m.email}</a></span>
              </div>
              <span className="d-hint">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="d-msg__body">{m.message}</p>
            <div className="d-row">
              <a className="d-btn d-btn--sm d-btn--primary" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message on my portfolio")}`}>Reply</a>
              <button className="d-btn d-btn--sm" onClick={(e) => { e.stopPropagation(); setRead(m, !m.is_read); }}>{m.is_read ? "Mark unread" : "Mark read"}</button>
              <button className="d-icon-btn d-icon-btn--danger" aria-label={`Delete message from ${m.name}`} onClick={(e) => { e.stopPropagation(); remove(m); }}><TrashIcon /></button>
            </div>
          </article>
        ))}
      </div>
      <p style={{ marginTop: 12 }}><StatusText status={st.status} /></p>
    </>
  );
}
