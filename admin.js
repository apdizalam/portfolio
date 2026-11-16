// Admin dashboard: log in, edit projects/skills, publish to GitHub (-> Vercel redeploys).
(function () {
  const $ = (id) => document.getElementById(id);
  const { GITHUB_USER, iconUrl, safeUrl } = window.Portfolio;

  let token = "";
  try { token = sessionStorage.getItem("admin-token") || ""; } catch (e) {}

  let content = { skills: [], projects: [] };
  let uploads = {};        // slug -> { path, data }
  let dirty = false;
  let editing = null;      // slug being edited, or null for new
  let pendingImage = null; // { ext, data, preview }

  // ---------------------------------------------------------------- API
  async function api(path, options = {}) {
    const res = await fetch("/api/" + path, {
      method: options.method || "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "login") logout("Your session expired. Please log in again.");
    if (!res.ok) throw new Error(json.error || "Request failed (" + res.status + ")");
    return json;
  }

  const status = (id, msg, kind) => {
    const el = $(id);
    el.textContent = msg || "";
    el.className = "form-status" + (kind ? " is-" + kind : "");
  };

  // ---------------------------------------------------------------- auth
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    status("login-status", "Checking…");
    try {
      const { token: t } = await api("login", { method: "POST", body: { password: $("password").value } });
      token = t;
      try { sessionStorage.setItem("admin-token", t); } catch (err) {}
      $("password").value = "";
      status("login-status", "");
      await openDashboard();
    } catch (err) {
      status("login-status", err.message, "error");
    }
  });

  function logout(msg) {
    token = "";
    try { sessionStorage.removeItem("admin-token"); } catch (e) {}
    $("dash-view").hidden = $("tab-projects").hidden = $("tab-skills").hidden = $("publish-bar").hidden = true;
    $("login-view").hidden = false;
    status("login-status", msg || "", msg ? "error" : "");
  }
  $("logout").addEventListener("click", () => {
    if (dirty && !confirm("You have unpublished changes. Log out anyway?")) return;
    logout();
  });

  async function openDashboard() {
    $("login-view").hidden = true;
    $("dash-view").hidden = false;
    $("publish-bar").hidden = false;
    status("publish-status", "Loading content from GitHub…");
    try {
      const data = await api("content");
      content = { skills: data.content.skills || [], projects: data.content.projects || [] };
      setDirty(false);
      showTab("projects");
      render();
    } catch (err) {
      status("publish-status", err.message, "error");
    }
  }

  // ---------------------------------------------------------------- tabs
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  function showTab(name) {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    $("tab-projects").hidden = name !== "projects";
    $("tab-skills").hidden = name !== "skills";
  }

  function setDirty(v) {
    dirty = v;
    $("publish").disabled = !v;
    if (v) status("publish-status", "You have unpublished changes.");
    else status("publish-status", "No unpublished changes.");
  }
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------------------------------------------------------------- render
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const button = (label, cls, fn) => {
    const b = el("button", "btn-plain " + (cls || ""), label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  };

  function render() {
    const list = $("project-list");
    list.innerHTML = "";
    if (!content.projects.length) list.appendChild(el("p", "hint", "No projects yet."));
    content.projects.forEach((p, i) => {
      const row = el("div", "admin-item");
      const img = el("img");
      img.alt = "";
      img.src = (uploads[p.slug] && uploads[p.slug].preview) || safeUrl(p.image) || "assets/profile.jpg";
      const text = el("div", "admin-item__text");
      text.append(el("strong", null, p.title), el("span", null, p.summary || p.repo || ""));
      const actions = el("div", "admin-item__actions");
      if (i > 0) actions.appendChild(button("↑", "", () => move(content.projects, i, -1)));
      actions.append(
        button("Edit", "", () => openProjectForm(p.slug)),
        button("Delete", "btn-danger", () => {
          if (!confirm(`Delete "${p.title}" from the portfolio?`)) return;
          content.projects.splice(i, 1);
          delete uploads[p.slug];
          setDirty(true);
          render();
        })
      );
      row.append(img, text, actions);
      list.appendChild(row);
    });

    const skills = $("skill-list");
    skills.innerHTML = "";
    const chips = el("ul", "chips");
    chips.style.paddingLeft = "0";
    content.skills.forEach((s, i) => {
      const li = el("li", "chip");
      const src = iconUrl(s.icon);
      if (src) {
        const img = el("img");
        img.src = src;
        img.alt = "";
        img.onerror = () => img.remove();
        li.appendChild(img);
      }
      li.appendChild(document.createTextNode(s.name));
      const x = el("button", "btn-plain btn-danger", "×");
      x.type = "button";
      x.setAttribute("aria-label", "Remove " + s.name);
      x.style.padding = "0 8px";
      x.addEventListener("click", () => { content.skills.splice(i, 1); setDirty(true); render(); });
      li.appendChild(x);
      chips.appendChild(li);
    });
    skills.appendChild(chips);
  }

  function move(arr, i, d) {
    const [item] = arr.splice(i, 1);
    arr.splice(i + d, 0, item);
    setDirty(true);
    render();
  }

  // ---------------------------------------------------------------- project form
  const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  function openProjectForm(slug) {
    editing = slug || null;
    pendingImage = null;
    const p = content.projects.find((x) => x.slug === slug) || {};
    $("project-form-title").textContent = slug ? "Edit project" : "Add project";
    $("pf-repo").value = p.repo || "";
    $("pf-title").value = p.title || "";
    $("pf-summary").value = p.summary || "";
    $("pf-live").value = p.live || "";
    $("pf-tags").value = (p.tags || []).join(", ");
    $("pf-image").value = "";
    const prev = (uploads[slug] && uploads[slug].preview) || safeUrl(p.image);
    $("pf-preview").hidden = !prev;
    if (prev) $("pf-preview").src = prev;
    status("pf-status", "");
    $("project-form").hidden = false;
    $("project-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("new-project").addEventListener("click", () => openProjectForm(null));
  $("pf-cancel").addEventListener("click", () => { $("project-form").hidden = true; });

  // Fill title/description/link/languages from the public GitHub repo
  $("pf-import").addEventListener("click", async () => {
    const repo = $("pf-repo").value.trim();
    if (!repo) return status("pf-status", "Type the repo name first.", "error");
    const full = repo.includes("/") ? repo : `${GITHUB_USER}/${repo}`;
    status("pf-status", "Reading " + full + " from GitHub…");
    try {
      const [info, langs] = await Promise.all([
        fetch(`https://api.github.com/repos/${full}`).then((r) => { if (!r.ok) throw new Error("Repo not found"); return r.json(); }),
        fetch(`https://api.github.com/repos/${full}/languages`).then((r) => (r.ok ? r.json() : {})),
      ]);
      $("pf-repo").value = info.owner.login.toLowerCase() === GITHUB_USER.toLowerCase() ? info.name : info.full_name;
      if (!$("pf-title").value) $("pf-title").value = info.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (!$("pf-summary").value && info.description) $("pf-summary").value = info.description;
      if (!$("pf-live").value && info.homepage) $("pf-live").value = info.homepage;
      if (!$("pf-tags").value) {
        const tags = [...(info.topics || []), ...Object.keys(langs)].slice(0, 6);
        $("pf-tags").value = tags.join(", ");
      }
      status("pf-status", "Filled from GitHub. Add a cover image, then save.", "success");
    } catch (err) {
      status("pf-status", err.message === "Repo not found" ? "Couldn't find that public repo." : "GitHub is busy, try again in a minute.", "error");
    }
  });

  // Compress the chosen image to WebP in the browser (keeps uploads small)
  $("pf-image").addEventListener("change", async () => {
    const file = $("pf-image").files[0];
    if (!file) return;
    try {
      pendingImage = await compress(file);
      $("pf-preview").src = pendingImage.preview;
      $("pf-preview").hidden = false;
    } catch (err) {
      pendingImage = null;
      status("pf-status", "That image couldn't be read. Try a PNG or JPG.", "error");
    }
  });

  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/webp", 0.82);
        let ext = "webp";
        if (!url.startsWith("data:image/webp")) { url = c.toDataURL("image/jpeg", 0.85); ext = "jpg"; }
        URL.revokeObjectURL(img.src);
        resolve({ ext, preview: url, data: url.split(",")[1] });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  $("project-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("pf-title").value.trim();
    const live = $("pf-live").value.trim();
    if (!title) return status("pf-status", "Please add a title.", "error");
    if (live && !/^https?:\/\//i.test(live)) return status("pf-status", "The live link must start with https://", "error");

    const existing = content.projects.find((p) => p.slug === editing);
    let slug = existing ? existing.slug : slugify($("pf-repo").value.trim().split("/").pop() || title);
    if (!slug) slug = "project";
    if (!existing) {
      let n = 2, base = slug;
      while (content.projects.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
    }

    const project = {
      slug,
      title,
      summary: $("pf-summary").value.trim(),
      repo: $("pf-repo").value.trim(),
      live,
      image: existing ? existing.image : "",
      tags: $("pf-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (pendingImage) {
      const path = `assets/projects/${slug}.${pendingImage.ext}`;
      uploads[slug] = { path, data: pendingImage.data, preview: pendingImage.preview };
      project.image = path;
    }

    if (existing) Object.assign(existing, project);
    else content.projects.push(project);

    $("project-form").hidden = true;
    setDirty(true);
    render();
  });

  // ---------------------------------------------------------------- skills
  $("skill-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("sk-name").value.trim();
    if (!name) return;
    let icon = $("sk-icon").value.trim();
    if (!icon) icon = name.toLowerCase().replace(/\.js$/, "js").replace(/[^a-z0-9]/g, "");
    content.skills.push({ name, icon });
    $("sk-name").value = $("sk-icon").value = "";
    setDirty(true);
    render();
  });

  // ---------------------------------------------------------------- publish
  $("publish").addEventListener("click", async () => {
    $("publish").disabled = true;
    status("publish-status", "Publishing to GitHub…");
    try {
      const list = Object.values(uploads)
        .filter((u) => content.projects.some((p) => p.image === u.path))
        .map(({ path, data }) => ({ path, data }));
      await api("publish", { method: "POST", body: { content, uploads: list } });
      uploads = {};
      dirty = false;
      status("publish-status", "Published! Vercel is updating the site — it will be live in about a minute.", "success");
    } catch (err) {
      $("publish").disabled = false;
      status("publish-status", err.message, "error");
    }
  });

  // ---------------------------------------------------------------- start
  if (token) openDashboard();
})();
