"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AtomIcon, GridIcon, HomeIcon, MailIcon, MoonIcon, SunIcon, UserIcon } from "./Icons";

const ITEMS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "about", label: "About", Icon: UserIcon },
  { id: "projects", label: "Projects", Icon: GridIcon },
  { id: "skills", label: "Skills", Icon: AtomIcon },
  { id: "contact", label: "Contact", Icon: MailIcon },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className="bottomnav__link theme-toggle"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("theme", next); } catch {}
        setTheme(next);
      }}
    >
      <SunIcon className="icon-sun" />
      <MoonIcon className="icon-moon" />
      <span className="theme-label">{next === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}

export default function BottomNav({ items = ITEMS.map((i) => i.id) }: { items?: string[] }) {
  const onHome = usePathname() === "/";
  const [active, setActive] = useState(onHome ? "home" : "projects");

  useEffect(() => {
    if (!onHome) return;
    const onScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      if (atBottom) return setActive("contact");
      const y = window.scrollY + 140;
      let current = "home";
      ITEMS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) current = id;
      });
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  return (
    <nav className="bottomnav" aria-label="Quick navigation">
      {ITEMS.filter((i) => items.includes(i.id)).map(({ id, label, Icon }) => (
        <a
          key={id}
          href={onHome ? `#${id}` : `/#${id}`}
          className={`bottomnav__link${active === id ? " is-active" : ""}`}
          aria-current={active === id ? "true" : undefined}
        >
          <Icon />
          <span>{label}</span>
        </a>
      ))}
      <ThemeToggle />
    </nav>
  );
}
