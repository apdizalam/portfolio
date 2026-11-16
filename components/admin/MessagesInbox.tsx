"use client";
import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import { db, StatusLine, type Status } from "./helpers";

export default function MessagesInbox({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>(null);

  const load = useCallback(async () => {
    const { data, error } = await db().from("messages").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) setStatus({ text: error.message, kind: "error" });
    else setList((data as Message[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRead(m: Message, is_read: boolean) {
    const { error } = await db().from("messages").update({ is_read }).eq("id", m.id);
    if (error) return setStatus({ text: error.message, kind: "error" });
    setList(list.map((x) => (x.id === m.id ? { ...x, is_read } : x)));
    onChange();
  }

  async function remove(m: Message) {
    if (!confirm(`Delete the message from ${m.name}?`)) return;
    const { error } = await db().from("messages").delete().eq("id", m.id);
    if (error) return setStatus({ text: error.message, kind: "error" });
    setList(list.filter((x) => x.id !== m.id));
    onChange();
  }

  return (
    <section className="section">
      <div className="card admin-card">
        <h2 className="section__title">Messages</h2>
        <p className="hint">Every message from your contact form is saved here and also emailed to you.</p>
        <div className="admin-list">
          {list.length === 0 && <p className="hint">No messages yet.</p>}
          {list.map((m) => (
            <div key={m.id} className={`admin-item admin-msg${m.is_read ? "" : " is-unread"}`}>
              <div className="admin-msg__head">
                <strong>{m.name} · <a href={`mailto:${m.email}`}>{m.email}</a></strong>
                <span className="hint">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="admin-msg__body">{m.message}</p>
              <div className="admin-item__actions">
                <a className="btn-plain" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}>Reply</a>
                <button type="button" className="btn-plain" onClick={() => setRead(m, !m.is_read)}>{m.is_read ? "Mark unread" : "Mark read"}</button>
                <button type="button" className="btn-plain btn-danger" onClick={() => remove(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <StatusLine status={status} />
      </div>
    </section>
  );
}
