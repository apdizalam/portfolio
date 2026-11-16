// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

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
