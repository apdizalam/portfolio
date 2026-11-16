"use client";
import { useState } from "react";

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="dash-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="d-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export type DStatus = { text: string; kind?: "error" | "success" } | null;

export function StatusText({ status }: { status: DStatus }) {
  return (
    <span className={`d-status${status?.kind ? " is-" + status.kind : ""}`} role="status" aria-live="polite">
      {status?.text || ""}
    </span>
  );
}

export function useStatus() {
  const [status, setStatus] = useState<DStatus>(null);
  return {
    status,
    info: (text: string) => setStatus({ text }),
    ok: (text: string) => setStatus({ text, kind: "success" }),
    fail: (text: string) => setStatus({ text, kind: "error" }),
    clear: () => setStatus(null),
  };
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
