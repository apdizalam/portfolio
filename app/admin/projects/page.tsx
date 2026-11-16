"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { db, dbError, refreshSite } from "@/components/admin/helpers";
import { PageHead, StatusText, Switch, formatDate, useStatus } from "@/components/admin/ui";
import { ArrowDownIcon, ArrowUpIcon, ExternalIcon, GripIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";

export default function ProjectsAdminPage() {
  const [list, setList] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const st = useStatus();
  const listRef = useRef(list);
  listRef.current = list;

  const load = useCallback(async () => {
    const { data, error } = await db().from("projects").select("*").order("sort").order("id");
    if (error) st.fail(dbError(error.message));
    else setList((data as Project[]) || []);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(p: Project, field: "featured" | "published", value: boolean) {
    setBusyId(p.id);
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, [field]: value } : x)));
    const { error } = await db().from("projects").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", p.id);
    setBusyId(null);
    if (error) {
      setList((l) => l.map((x) => (x.id === p.id ? { ...x, [field]: !value } : x)));
      return st.fail(dbError(error.message));
    }
    await refreshSite();
    st.ok(`${p.title}: ${field === "featured" ? (value ? "shown on home page" : "hidden from home page") : value ? "published" : "unpublished"}.`);
  }

  async function saveOrder(next: Project[]) {
    setList(next);
    const results = await Promise.all(next.map((p, i) => db().from("projects").update({ sort: i }).eq("id", p.id)));
    const err = results.find((r) => r.error)?.error;
    if (err) return st.fail(dbError(err.message));
    await refreshSite();
    st.ok("Order saved.");
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    saveOrder(next);
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    const { error } = await db().from("projects").delete().eq("id", p.id);
    if (error) return st.fail(dbError(error.message));
    setList((l) => l.filter((x) => x.id !== p.id));
    await refreshSite();
    st.ok(`Deleted "${p.title}".`);
  }

  return (
    <>
      <PageHead title="Projects" sub="Featured projects appear on the home page; all published ones on /projects. Drag rows to rearrange.">
        <Link href="/admin/projects/new" className="d-btn d-btn--primary"><PlusIcon /> New project</Link>
      </PageHead>

      <div className="d-card d-table-wrap">
        <table className="d-table">
          <thead>
            <tr>
              <th aria-label="Reorder" />
              <th>Title</th>
              <th>Featured</th>
              <th>Published</th>
              <th className="num">Views</th>
              <th>Updated</th>
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loaded && <tr><td colSpan={7} className="d-empty">Loading…</td></tr>}
            {loaded && list.length === 0 && <tr><td colSpan={7} className="d-empty">No projects yet. Click “New project” to add one.</td></tr>}
            {list.map((p, i) => (
              <tr
                key={p.id}
                className={`${dragIndex === i ? "is-dragging" : ""} ${overIndex === i && dragIndex !== i ? "is-over" : ""}`}
                draggable
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
                onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
                onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              >
                <td className="d-handle" title="Drag to reorder"><GripIcon /></td>
                <td className="d-title">
                  <b>{p.title}</b>
                  <span>/{p.slug}</span>
                </td>
                <td><Switch checked={p.featured !== false} disabled={busyId === p.id} label={`Show ${p.title} on home page`} onChange={(v) => toggle(p, "featured", v)} /></td>
                <td><Switch checked={p.published !== false} disabled={busyId === p.id} label={`Publish ${p.title}`} onChange={(v) => toggle(p, "published", v)} /></td>
                <td className="num">{(p.views || 0).toLocaleString()}</td>
                <td className="muted">{formatDate(p.updated_at)}</td>
                <td className="actions">
                  <button className="d-icon-btn" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUpIcon /></button>
                  <button className="d-icon-btn" aria-label={`Move ${p.title} down`} disabled={i === list.length - 1} onClick={() => move(i, i + 1)}><ArrowDownIcon /></button>
                  <a className="d-icon-btn" href={`/projects/${p.slug}`} target="_blank" rel="noopener" aria-label={`Open ${p.title}`}><ExternalIcon /></a>
                  <Link className="d-icon-btn" href={`/admin/projects/${p.id}`} aria-label={`Edit ${p.title}`}><PencilIcon /></Link>
                  <button className="d-icon-btn d-icon-btn--danger" aria-label={`Delete ${p.title}`} onClick={() => remove(p)}><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 12 }}><StatusText status={st.status} /></p>
    </>
  );
}
