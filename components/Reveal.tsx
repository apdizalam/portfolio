"use client";
import { useEffect, useRef } from "react";

// Fades a section in when it scrolls into view (CSS: .reveal / .is-visible).
export default function Reveal({
  as: Tag = "section",
  className = "",
  children,
  ...rest
}: { as?: any; className?: string; children: React.ReactNode } & Record<string, any>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return el.classList.add("is-visible");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); }
      }),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
