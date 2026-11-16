"use client";
import { useCallback, useEffect, useState } from "react";
import type { Skill } from "@/lib/types";
import SkillChip from "../SkillChip";
import { db, refreshSite, StatusLine, type Status } from "./helpers";

export default function SkillsEditor() {
  const [list, setList] = useState<Skill[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [status, setStatus] = useState<Status>(null);

  const load = useCallback(async () => {
    const { data, error } = await db().from("skills").select("*").order("sort").order("id");
    if (error) setStatus({ text: error.message, kind: "error" });
    else setList((data as Skill[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const ic = icon.trim() || n.toLowerCase().replace(/\.js$/, "js").replace(/[^a-z0-9]/g, "");
    const { error } = await db().from("skills").insert({ name: n, icon: ic, sort: list.length });
    if (error) return setStatus({ text: error.message, kind: "error" });
    setName(""); setIcon("");
    await refreshSite();
    await load();
    setStatus({ text: `Added ${n}.`, kind: "success" });
  }

  async function remove(s: Skill) {
    const { error } = await db().from("skills").delete().eq("id", s.id);
    if (error) return setStatus({ text: error.message, kind: "error" });
    await refreshSite();
    await load();
  }

  return (
    <section className="section">
      <div className="card admin-card">
        <h2 className="section__title">Skills</h2>
        <ul className="chips" style={{ paddingLeft: 0 }}>
          {list.map((s) => (
            <SkillChip key={s.id} name={s.name} icon={s.icon}>
              <button type="button" className="btn-plain btn-danger" style={{ padding: "0 8px" }} aria-label={`Remove ${s.name}`} onClick={() => remove(s)}>×</button>
            </SkillChip>
          ))}
        </ul>
        <form className="admin-row" onSubmit={add}>
          <div className="field"><label htmlFor="sk-name">Skill</label><input id="sk-name" required maxLength={40} placeholder="TypeScript" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="sk-icon">Icon <span className="optional">(optional)</span></label><input id="sk-icon" maxLength={300} placeholder="typescript" value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
          <button type="submit" className="btn btn--outline">Add</button>
        </form>
        <p className="hint">Icon names come from <a href="https://devicon.dev" target="_blank" rel="noopener">devicon.dev</a> (e.g. typescript, python, docker). Leave empty to guess from the name.</p>
        <StatusLine status={status} />
      </div>
    </section>
  );
}
