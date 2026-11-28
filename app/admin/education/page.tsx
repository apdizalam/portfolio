"use client";
import { useCallback, useEffect, useState } from "react";
import type { Education } from "@/lib/types";
import { db, dbError, refreshSite, uploadImage } from "@/components/admin/helpers";
import { safeUrl } from "@/lib/utils";
import { PageHead, StatusText, useStatus } from "@/components/admin/ui";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/Icons";

type Row = Omit<Education, "id"> & { id?: number };
const FIELDS: [keyof Row, string, string][] = [
  ["school", "School / University", "Amoud University"],
  ["degree", "Degree", "Bachelor's Degree in Software Engineering"],
  ["dates", "Dates", "Jul 2022 – Sep 2026"],
  ["place", "City", "Borama"],
];

export default function EducationAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const st = useStatus();

  const load = useCallback(async () => {
    const { data, error } = await db().from("education").select("*").order("sort").order("id");
    if (error) st.fail(dbError(error.message));
    else setRows((data as Education[]) || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveAll() {
    if (rows.some((r) => !r.school.trim())) return st.fail("Every entry needs a school name.");
    setBusy(true);
    st.info("Saving…");
    try {
      for (const [i, r] of rows.entries()) {
        const row: Record<string, unknown> = { school: r.school.trim(), degree: r.degree.trim(), dates: r.dates.trim(), place: r.place.trim(), sort: i };
        if (r.logo_url !== undefined) row.logo_url = r.logo_url;
        const { error } = r.id ? await db().from("education").update(row).eq("id", r.id) : await db().from("education").insert(row);
        if (error) throw new Error(error.message);
      }
      await load();
      await refreshSite();
      st.ok("Saved. Your live site is updated.");
    } catch (e: any) {
      st.fail(dbError(e.message));
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    st.info("Order changed. Click Save education to keep it.");
  }

  async function onLogo(i: number, file: File | undefined) {
    if (!file) return;
    st.info("Uploading logo…");
    try {
      const url = await uploadImage(file, "projects", "logo", 200);
      setRows((list) => list.map((x, j) => (j === i ? { ...x, logo_url: url } : x)));
      st.ok("Logo uploaded. Click Save education to keep it.");
    } catch (err: any) {
      st.fail(err.message || "Upload failed");
    }
  }

  async function remove(i: number) {
    const r = rows[i];
    if (!confirm(`Remove ${r.school || "this entry"}?`)) return;
    if (r.id) {
      const { error } = await db().from("education").delete().eq("id", r.id);
      if (error) return st.fail(dbError(error.message));
      await refreshSite();
    }
    setRows(rows.filter((_, j) => j !== i));
  }

  return (
    <>
      <PageHead title="Education" sub="Schools and degrees shown on your home page.">
        <button className="d-btn" onClick={() => setRows([...rows, { school: "", degree: "", dates: "", place: "", sort: rows.length }])}><PlusIcon /> Add entry</button>
      </PageHead>
      {rows.length === 0 && <div className="d-card"><p className="d-empty">No education entries yet.</p></div>}
      {rows.map((r, i) => (
        <section key={r.id ?? `new-${i}`} className="d-card d-section" style={{ padding: 18 }}>
          <div className="d-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>{r.school || "New entry"}</h2>
            <div className="d-row">
              <button className="d-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /></button>
              <button className="d-icon-btn" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /></button>
              <button className="d-icon-btn d-icon-btn--danger" aria-label="Remove entry" onClick={() => remove(i)}><TrashIcon /></button>
            </div>
          </div>
          <div className="d-grid">
            {FIELDS.map(([k, label, ph]) => (
              <div className="d-field" key={k}>
                <label htmlFor={`edu-${i}-${k}`}>{label}</label>
                <input id={`edu-${i}-${k}`} maxLength={160} placeholder={ph} value={String(r[k] ?? "")}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
              </div>
            ))}
            <div className="d-field d-full">
              <label htmlFor={`edu-${i}-logo`}>Logo <span className="d-hint">(the institution&apos;s real logo — optional)</span></label>
              <div className="d-file">
                {safeUrl(r.logo_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeUrl(r.logo_url)} alt="" style={{ width: 48, height: 48, padding: 4, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid var(--d-border)" }} />
                ) : null}
                <input id={`edu-${i}-logo`} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onLogo(i, e.target.files?.[0])} />
                {r.logo_url && (
                  <button type="button" className="d-btn d-btn--sm d-btn--danger" onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, logo_url: "" } : x)))}>Remove logo</button>
                )}
              </div>
              <span className="d-hint">Without a logo, a plain graduation-cap icon is shown.</span>
            </div>
          </div>
        </section>
      ))}
      <div className="d-savebar">
        <StatusText status={st.status} />
        <button className="d-btn d-btn--primary" disabled={busy} onClick={saveAll}>{busy ? "Saving…" : "Save education"}</button>
      </div>
    </>
  );
}
