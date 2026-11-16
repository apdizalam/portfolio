"use client";
import { useCallback, useEffect, useState } from "react";
import type { Skill } from "@/lib/types";
import { iconUrl } from "@/lib/utils";
import { db, dbError, refreshSite } from "@/components/admin/helpers";
import { PageHead, StatusText, useStatus } from "@/components/admin/ui";
import { TrashIcon } from "@/components/Icons";

export default function SkillsAdminPage() {
  const [list, setList] = useState<Skill[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const st = useStatus();

  const load = useCallback(async () => {
    const { data, error } = await db().from("skills").select("*").order("sort").order("id");
    if (error) st.fail(dbError(error.message));
    else setList((data as Skill[]) || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const ic = icon.trim() || n.toLowerCase().replace(/\.js$/, "js").replace(/[^a-z0-9]/g, "");
    const { error } = await db().from("skills").insert({ name: n, icon: ic, sort: list.length });
    if (error) return st.fail(dbError(error.message));
    setName(""); setIcon("");
    await load();
    await refreshSite();
    st.ok(`Added ${n}.`);
  }

  async function remove(s: Skill) {
    const { error } = await db().from("skills").delete().eq("id", s.id);
    if (error) return st.fail(dbError(error.message));
    setList(list.filter((x) => x.id !== s.id));
    await refreshSite();
    st.ok(`Removed ${s.name}.`);
  }

  return (
    <>
      <PageHead title="Skills" sub="The technologies shown in your Skills section." />
      <section className="d-section">
        <div className="d-card" style={{ padding: 16 }}>
          {list.length === 0 ? <p className="d-empty">No skills yet.</p> : (
            <div className="d-chips">
              {list.map((s) => (
                <span key={s.id} className="d-chip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {iconUrl(s.icon) && <img src={iconUrl(s.icon)} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />}
                  {s.name}
                  <button type="button" className="d-icon-btn d-icon-btn--danger" style={{ width: 26, height: 26 }} aria-label={`Remove ${s.name}`} onClick={() => remove(s)}><TrashIcon /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="d-section">
        <h2>Add a skill</h2>
        <p className="d-sub">Icons come from <a href="https://devicon.dev" target="_blank" rel="noopener">devicon.dev</a> (e.g. typescript, python, docker). Leave empty to guess from the name.</p>
        <form className="d-grid" onSubmit={add}>
          <div className="d-field"><label htmlFor="sk-name">Skill</label><input id="sk-name" required maxLength={40} placeholder="TypeScript" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="d-field"><label htmlFor="sk-icon">Icon name</label><input id="sk-icon" maxLength={300} placeholder="typescript" value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
          <div className="d-full d-row"><button type="submit" className="d-btn d-btn--primary">Add skill</button><StatusText status={st.status} /></div>
        </form>
      </section>
    </>
  );
}
