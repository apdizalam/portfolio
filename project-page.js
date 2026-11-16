// Project detail page: shows project info and renders the repo README from GitHub.
(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  const slug = new URLSearchParams(location.search).get("p");
  const $ = (id) => document.getElementById(id);
  const readmeEl = $("readme");
  const { GITHUB_USER, loadContent, safeUrl } = window.Portfolio;

  function notFound() {
    $("pd-title").textContent = "Project not found";
    $("pd-cover").remove();
    readmeEl.innerHTML = '<p class="readme__status">This project does not exist. <a href="/#projects">Go back to all projects</a>.</p>';
  }

  loadContent()
    .then(({ projects = [] }) => {
      const project = projects.find((p) => p.slug === slug);
      if (!project) return notFound();
      render(project);
    })
    .catch(notFound);

  function link(cls, href, html) {
    const a = document.createElement("a");
    a.className = cls;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = html;
    return a;
  }

  function render(project) {
  // repo can be "name" (under GITHUB_USER) or "owner/name"
  const repoPath = project.repo ? (project.repo.includes("/") ? project.repo : `${GITHUB_USER}/${project.repo}`) : "";
  const repoUrl = repoPath ? `https://github.com/${repoPath}` : "";
  const rawBase = `https://raw.githubusercontent.com/${repoPath}/HEAD/`;
  const blobBase = `${repoUrl}/blob/HEAD/`;

  // ---- Header -------------------------------------------------------------
  document.title = `${project.title} — Abdisalam Mohamed Muhumed`;
  $("pd-title").textContent = project.title;
  $("pd-summary").textContent = project.summary || "";
  const cover = $("pd-cover");
  const img = safeUrl(project.image);
  if (img) { cover.src = img; cover.alt = `${project.title} screenshot`; } else cover.remove();

  (project.tags || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    $("pd-tags").appendChild(li);
  });

  const actions = $("pd-actions");
  const arrow = '<span aria-hidden="true">→</span>';
  const gh = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
  const live = safeUrl(project.live);
  if (live && /^https?:/.test(live)) actions.appendChild(link("btn btn--solid", live, "Live Demo " + arrow));
  if (repoUrl) actions.appendChild(link("btn btn--outline", repoUrl, gh + " View Code"));

  // ---- Mobile app download + install steps --------------------------------
  const appLink = safeUrl(project.appLink);
  if (appLink && /^https:/.test(appLink)) {
    const phone = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>';
    actions.appendChild(link("btn btn--outline", appLink, phone + " Mobile App"));
    $("pd-app-link").href = appLink;
    const steps = String(project.appNote || "Open this link on your phone and tap Install.")
      .split("\n").map((s) => s.trim()).filter(Boolean);
    steps.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      $("pd-app-steps").appendChild(li);
    });
    $("pd-app").hidden = false;
  }

  if (!repoUrl) {
    readmeEl.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = project.summary || "";
    readmeEl.appendChild(p);
    return;
  }

  // ---- README -------------------------------------------------------------
  const isAbsolute = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
  const clean = (u) => u.replace(/^\.\//, "").replace(/^\//, "");

  function slugify(text) {
    return text.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s/g, "-");
  }

  function fixUp(container) {
    container.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src && !isAbsolute(src)) img.src = rawBase + clean(src);
      img.loading = "lazy";
    });
    container.querySelectorAll("source[srcset]").forEach((s) => {
      const src = s.getAttribute("srcset");
      if (!isAbsolute(src)) s.setAttribute("srcset", rawBase + clean(src));
    });
    container.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href.startsWith("#")) return;
      if (!isAbsolute(href)) a.href = blobBase + clean(href);
      a.target = "_blank";
      a.rel = "noopener";
    });
    const seen = {};
    container.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      let id = slugify(h.textContent);
      if (seen[id] !== undefined) id += "-" + ++seen[id]; else seen[id] = 0;
      h.id = id;
    });
  }

  async function loadReadme() {
    // raw file first (no rate limit), then the GitHub API as a fallback
    const attempts = [
      () => fetch(rawBase + "README.md"),
      () => fetch(`https://api.github.com/repos/${repoPath}/readme`, {
        headers: { Accept: "application/vnd.github.raw" },
      }),
    ];
    for (const attempt of attempts) {
      try {
        const res = await attempt();
        if (res.ok) return await res.text();
      } catch (e) { /* try next */ }
    }
    throw new Error("README not available");
  }

  loadReadme()
    .then((md) => {
      const html = DOMPurify.sanitize(marked.parse(md, { gfm: true }), {
        ADD_ATTR: ["align", "target"],
      });
      readmeEl.innerHTML = html;
      fixUp(readmeEl);
    })
    .catch(() => {
      readmeEl.innerHTML =
        `<p class="readme__status">Couldn't load the README right now. <a href="${repoUrl}#readme" target="_blank" rel="noopener">Read it on GitHub</a>.</p>`;
    });
  }
})();
