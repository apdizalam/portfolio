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

  loadContent()
    .then(({ skills = [], projects = [] }) => {
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

      projects.forEach((p, i) => {
        const card = el("article", "card project");
        const thumb = el("div", "project__thumb");
        thumb.setAttribute("aria-hidden", "true");
        const img = el("img");
        img.src = safeUrl(p.image) || "assets/profile.jpg";
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);

        const body = el("div", "project__body");
        body.append(el("h3", null, p.title), el("p", null, p.summary));
        const link = el("a", "btn " + (i % 2 ? "btn--solid" : "btn--outline"), "View Project ");
        link.href = "project?p=" + encodeURIComponent(p.slug);
        const arrow = el("span", null, "→");
        arrow.setAttribute("aria-hidden", "true");
        link.appendChild(arrow);
        body.appendChild(link);

        card.append(thumb, body);
        projectsEl.appendChild(card);
      });
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
      return setStatus("Please fill in your name, email and message.", "error");
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
          _subject: data.subject.trim() ? `Portfolio: ${data.subject.trim()}` : `New portfolio message from ${data.name.trim()}`,
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
      setStatus(`Sorry, the message couldn't be sent. Please try again or email ${CONTACT_EMAIL}.`, "error");
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
