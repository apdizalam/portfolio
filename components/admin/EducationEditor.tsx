"use client";
import { useCallback, useEffect, useState } from "react";
import type { Education } from "@/lib/types";
import { db, refreshSite, StatusLine, type Status } from "./helpers";

type Row = Omit<Education, "id"> & { id?: number };
const FIELDS: [keyof Row, string][] = [
  ["school", "School / University"],
  ["degree", "Degree"],
  ["dates", "Dates (e.g. Jul 2022 – Sep 2026)"],
  ["place", "City"],
];

export default function EducationEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db().from("education").select("*").order("sort").order("id");
    if (error) setStatus({ text: error.message, kind: "error" });
    else setRows((data as Education[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveAll() {
    if (rows.some((r) => !r.school.trim())) return setStatus({ text: "Every entry needs a school name.", kind: "error" });
    setBusy(true);
    setStatus({ text: "Saving…" });
    try {
      for (const [i, r] of rows.entries()) {
        const row = { school: r.school.trim(), degree: r.degree.trim(), dates: r.dates.trim(), place: r.place.trim(), sort: i };
        const { error } = r.id
          ? await db().from("education").update(row).eq("id", r.id)
          : await db().from("education").insert(row);
        if (error) throw new Error(error.message);
      }
      await refreshSite();
      await load();
      setStatus({ text: "Saved! Your live site is updated.", kind: "success" });
    } catch (e: any) {
      setStatus({ text: e.message, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(i: number) {
    const r = rows[i];
    if (!confirm("Remove this education entry?")) return;
    if (r.id) {
      const { error } = await db().from("education").delete().eq("id", r.id);
      if (error) return setStatus({ text: error.message, kind: "error" });
      await refreshSite();
    }
    setRows(rows.filter((_, j) => j !== i));
  }

  return (
    <section className="section">
      <div className="card admin-card">
        <h2 className="section__title">Education</h2>
        <div className="admin-list">
          {rows.length === 0 && <p className="hint">No education entries.</p>}
          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="admin-item admin-edu">
              <div className="admin-grid" style={{ flex: 1 }}>
                {FIELDS.map(([k, label]) => (
                  <div className="field" key={k}>
                    <label htmlFor={`edu-${i}-${k}`}>{label}</label>
                    <input id={`edu-${i}-${k}`} maxLength={160} value={String(r[k] ?? "")}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  </div>
                ))}
              </div>
              <div className="admin-item__actions">
                <button type="button" className="btn-plain btn-danger" onClick={() => remove(i)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-row">
          <button type="button" className="btn btn--outline" onClick={() => setRows([...rows, { school: "", degree: "", dates: "", place: "", sort: rows.length }])}>+ Add education</button>
          <button type="button" className="btn btn--solid" disabled={busy} onClick={saveAll}>Save education</button>
        </div>
        <StatusLine status={status} />
      </div>
    </section>
  );
}
