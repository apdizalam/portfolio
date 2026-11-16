"use client";
import { useState } from "react";
import { iconUrl } from "@/lib/utils";

export default function SkillChip({ name, icon, children }: { name: string; icon: string; children?: React.ReactNode }) {
  const [ok, setOk] = useState(true);
  const src = iconUrl(icon);
  return (
    <li className="chip">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && ok && <img src={src} alt="" width={18} height={18} onError={() => setOk(false)} />}
      {name}
      {children}
    </li>
  );
}
