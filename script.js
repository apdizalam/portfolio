// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   Skills + projects from data/content.json (edited via /admin)
--------------------------------------------------------- */
(function renderContent() {
  const { loadContent, iconUrl, safeUrl } = window.Portfolio;
  const skillsEl = document.getElementById("skills-list");
  const projectsEl = document.getElementById("projects-list");

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // **bold** -> <strong>, everything else as plain text
  function richText(target, text) {
    target.innerHTML = "";
    String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach((para) => {
      const p = el("p");
      para.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) p.appendChild(el("strong", null, part.slice(2, -2)));
        else p.appendChild(document.createTextNode(part));
      });
      target.appendChild(p);
    });
  }

  function renderProfile(profile, education) {
    if (profile) {
      const set = (id, text) => { const n = document.getElementById(id); if (n && text != null) n.textContent = text; };
      set("hero-name", profile.name);
      set("hero-accent", profile.nameAccent);
      set("hero-title", profile.title);
      const full = [profile.name, profile.nameAccent].filter(Boolean).join(" ");
      set("hero-initials", full.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase());
      const note = document.getElementById("hero-note");
      if (note && profile.tagline != null) {
        note.innerHTML = "";
        profile.tagline.split("\n").forEach((line, i) => {
          if (i) note.appendChild(el("br"));
          note.appendChild(document.createTextNode(line));
        });
      }
      const photo = document.getElementById("hero-photo");
      const src = safeUrl(profile.photo);
      if (photo && src) { photo.src = src; photo.alt = "Portrait of " + full; }
      if (profile.about) richText(document.getElementById("about-text"), profile.about);
      [["social-github", profile.github], ["gh-title", profile.github],
       ["social-linkedin", profile.linkedin], ["contact-linkedin", profile.linkedin]].forEach(([id, url]) => {
        const a = document.getElementById(id);
        const u = safeUrl(url);
        if (a && u && /^https:/.test(u)) a.href = u;
      });
      if (full) document.title = full + " — Portfolio";
    }

    if (Array.isArray(education)) {
      const list = document.getElementById("education-list");
      const icon = list.querySelector(".timeline__icon");
      list.innerHTML = "";
      education.forEach((e) => {
        const li = el("li", "timeline__item");
        li.appendChild(icon ? icon.cloneNode(true) : el("div", "timeline__icon"));
        const body = el("div", "timeline__body");
        body.appendChild(el("h3", null, e.school));
        const meta = [e.dates, e.place].filter(Boolean).join(" • ");
        if (meta) body.appendChild(el("p", "meta", meta));
        if (e.degree) body.appendChild(el("p", null, e.degree));
        li.appendChild(body);
        list.appendChild(li);
      });
      document.getElementById("education").hidden = !education.length;
    }
  }

  // ---- Project card (image with floating links, badges, title, date, text, stack)
  const ICONS = {
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
  };

  function pill(href, iconHtml, label) {
    const a = el("a", "pcard__pill");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = iconHtml;
    a.appendChild(document.createTextNode(label));
    a.addEventListener("click", (e) => e.stopPropagation());
    return a;
  }

  function projectCard(p) {
    const url = "project?p=" + encodeURIComponent(p.slug);
    const card = el("article", "pcard");
    card.tabIndex = -1;

    // preview image (link) + floating buttons
    const media = el("div", "pcard__media");
    const mediaLink = el("a", "pcard__media-link");
    mediaLink.href = url;
    mediaLink.setAttribute("aria-label", "Open " + p.title);
    const zoom = el("div", "pcard__zoom");
    const img = el("img", "pcard__img");
    img.src = safeUrl(p.image) || "assets/profile.jpg";
    img.alt = p.title + " preview";
    img.loading = "lazy";
    img.decoding = "async";
    zoom.appendChild(img);
    mediaLink.appendChild(zoom);
    media.appendChild(mediaLink);

    const pills = el("div", "pcard__pills");
    const live = safeUrl(p.live);
    if (live && /^https?:/.test(live)) pills.appendChild(pill(live, ICONS.globe, "Website"));
    if (p.repo) {
      const repo = p.repo.includes("/") ? p.repo : `${window.Portfolio.GITHUB_USER}/${p.repo}`;
      pills.appendChild(pill("https://github.com/" + repo, ICONS.github, "Source"));
    }
    if (pills.children.length) media.appendChild(pills);

    // body
    const body = el("div", "pcard__body");
    const cats = p.categories && p.categories.length ? p.categories : [];
    if (cats.length) {
      const badges = el("div", "pcard__badges");
      cats.forEach((c) => badges.appendChild(el("span", "pcard__badge", c)));
      body.appendChild(badges);
    }

    const head = el("div", "pcard__head");
    const titles = el("div", "pcard__titles");
    const h3 = el("h3", "pcard__title");
    const titleLink = el("a", null, p.title);
    titleLink.href = url;
    h3.appendChild(titleLink);
    titles.appendChild(h3);
    if (p.date) titles.appendChild(el("time", "pcard__date", p.date));
    const arrow = el("a", "pcard__arrow");
    arrow.href = url;
    arrow.setAttribute("aria-label", "Open " + p.title);
    arrow.innerHTML = ICONS.arrow;
    head.append(titles, arrow);
    body.appendChild(head);

    if (p.summary) body.appendChild(el("p", "pcard__desc", p.summary));

    if (p.tags && p.tags.length) {
      const stack = el("div", "pcard__stack");
      p.tags.forEach((t) => stack.appendChild(el("span", "pcard__tech", t)));
      body.appendChild(stack);
    }

    card.append(media, body);

    // whole card opens the project; spotlight follows the pointer
    card.addEventListener("click", (e) => { if (!e.target.closest("a")) location.href = url; });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", e.clientX - r.left + "px");
      card.style.setProperty("--y", e.clientY - r.top + "px");
    });
    return card;
  }

  // Entrance animation with Motion (Framer Motion's vanilla library); CSS fallback
  function animateProjects(container) {
    const cards = [...container.querySelectorAll(".pcard")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const M = window.Motion;
    if (reduce || !M || !M.inView || !M.animate) {
      cards.forEach((c) => c.classList.add("is-in"));
      return;
    }
    cards.forEach((card, i) => {
      card.classList.add("is-motion");
      const reveal = () => {
        card.classList.add("is-in");
        // drop the finished entrance animation so CSS hover (lift/glow) takes over again
        if (card.getAnimations) card.getAnimations().forEach((a) => a.cancel());
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
      };
      const safety = setTimeout(reveal, 4000); // never leave a card hidden
      try {
        M.inView(card, () => {
          try {
            const anim = M.animate(card,
              { opacity: [0, 1], transform: ["translateY(28px) scale(0.98)", "translateY(0px) scale(1)"] },
              { duration: 0.7, delay: (i % 2) * 0.12, easing: [0.22, 1, 0.36, 1] }
            );
            Promise.resolve(anim && (anim.finished || anim)).then(() => { clearTimeout(safety); reveal(); }, reveal);
          } catch (e) { reveal(); }
        }, { margin: "0px 0px -10% 0px" });
      } catch (e) { reveal(); }
    });
  }

  loadContent()
    .then(({ profile, education, skills = [], projects = [] }) => {
      renderProfile(profile, education);
      skills.forEach((s) => {
        const li = el("li", "chip");
        const src = iconUrl(s.icon);
        if (src) {
          const img = el("img");
          img.src = src;
          img.alt = "";
          img.width = img.height = 18;
          img.onerror = () => img.remove();
          li.appendChild(img);
        }
        li.appendChild(document.createTextNode(s.name));
        skillsEl.appendChild(li);
      });

      projects.forEach((p) => projectsEl.appendChild(projectCard(p)));
      animateProjects(projectsEl);
    })
    .catch(() => {
      projectsEl.appendChild(el("p", "readme__status", "Projects couldn't be loaded right now."));
    });
})();

/* ---------------------------------------------------------
   Contact form -> Gmail (via FormSubmit, no server needed)
--------------------------------------------------------- */
(function contactForm() {
  const CONTACT_EMAIL = "abdisalammoh8@gmail.com";
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("cf-status");
  const button = form.querySelector("button[type=submit]");

  const setStatus = (msg, kind) => {
    status.textContent = msg;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return; // bot

    const invalid = [...form.querySelectorAll("[required]")].find((f) => !f.value.trim());
    if (invalid) {
      invalid.focus();
      return setStatus("Please fill in your name, email and description.", "error");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      form.elements.email.focus();
      return setStatus("Please enter a valid email address.", "error");
    }

    button.disabled = true;
    button.textContent = "Sending…";
    setStatus("");
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          _replyto: data.email.trim(),
          _subject: `New portfolio message from ${data.name.trim()}`,
          message: data.message.trim(),
          _template: "table",
          _captcha: "false",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) === "false") throw new Error(json.message || "Send failed");
      form.reset();
      setStatus("Thanks! Your message has been sent. I'll get back to you soon.", "success");
    } catch (err) {
      // Backup: open the visitor's email app with the message already written,
      // so the message still reaches the inbox even if the form service is down.
      const subject = `Portfolio message from ${data.name.trim()}`;
      const body = `${data.message.trim()}\n\n— ${data.name.trim()} (${data.email.trim()})`;
      const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "";
      status.className = "form-status is-error";
      status.append("The form couldn't send right now. ");
      const a = document.createElement("a");
      a.href = mailto;
      a.textContent = "Send it from your email app instead";
      a.style.textDecoration = "underline";
      status.append(a, " (your message is already filled in).");
      try { window.location.href = mailto; } catch (e) { /* link above still works */ }
    } finally {
      button.disabled = false;
      button.textContent = "Send message";
    }
  });
})();

/* ---------------------------------------------------------
   GitHub contribution calendar (53 weeks x 7 days)
   Placeholder data generated deterministically so it looks
   the same on every load. Swap `buildCalendar` input for real
   data later if you wire up the GitHub API.
--------------------------------------------------------- */
(function buildCalendar() {
  const grid = document.getElementById("gh-grid");
  const monthsEl = document.getElementById("gh-months");
  if (!grid || !monthsEl) return;

  // Real data from github-data.js: weeks -> days as [date, count, level 0-4]
  const data = window.GITHUB_CONTRIBUTIONS;
  if (!data) return;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const frag = document.createDocumentFragment();
  let lastMonth = -1;

  data.weeks.slice(-53).forEach((week, w, weeks) => {
    const first = new Date(week[0][0] + "T00:00:00");
    const label = document.createElement("span");
    if (first.getMonth() !== lastMonth && w < weeks.length - 2) {
      label.textContent = monthNames[first.getMonth()];
      lastMonth = first.getMonth();
    }
    monthsEl.appendChild(label);

    // pad the first (partial) week so days line up with weekday rows
    const startDay = first.getDay();
    for (let p = 0; p < (w === 0 ? startDay : 0); p++) {
      const pad = document.createElement("i");
      pad.style.visibility = "hidden";
      frag.appendChild(pad);
    }
    week.forEach(([date, count, lvl]) => {
      const cell = document.createElement("i");
      if (lvl) cell.className = "lvl-" + lvl;
      cell.title = `${count} contribution${count === 1 ? "" : "s"} on ${new Date(date + "T00:00:00").toDateString()}`;
      frag.appendChild(cell);
    });
  });
  grid.appendChild(frag);
  document.getElementById("gh-count").textContent = data.total.toLocaleString();
})();

/* ---------------------------------------------------------
   Reveal-on-scroll
--------------------------------------------------------- */
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-visible"));
}

/* ---------------------------------------------------------
   Active nav link (top + bottom) follows scroll position
--------------------------------------------------------- */
const sections = ["home", "about", "projects", "skills", "contact"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);
const links = document.querySelectorAll(".nav-link");

function setActive(id) {
  links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
}

function onScroll() {
  const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
  if (atBottom) return setActive("contact");
  const y = window.scrollY + 140;
  let current = "home";
  sections.forEach((s) => { if (s.offsetTop <= y) current = s.id; });
  setActive(current);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
