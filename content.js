// Shared helpers for loading the editable portfolio content (data/content.json).
// The admin page (/admin) edits that file through GitHub; Vercel redeploys on each change.
window.Portfolio = (function () {
  const GITHUB_USER = "apdizalam";
  const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/";

  let cache;
  function loadContent() {
    if (!cache) {
      cache = fetch("/data/content.json", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("content.json " + r.status);
        return r.json();
      });
    }
    return cache;
  }

  // devicon slug ("react") or a full https URL
  function iconUrl(icon) {
    if (!icon) return "";
    if (/^https:\/\//i.test(icon)) return icon;
    const slug = String(icon).toLowerCase().replace(/[^a-z0-9-]/g, "");
    return slug ? `${DEVICON}${slug}/${slug}-original.svg` : "";
  }

  // only allow http(s) links and site-relative asset paths
  function safeUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[\w./-]+$/.test(u) && !u.includes("..")) return u.replace(/^\/+/, "/");
    return "";
  }

  return { GITHUB_USER, loadContent, iconUrl, safeUrl };
})();
