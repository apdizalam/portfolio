// Shared helpers for the admin API (files starting with "_" are not routes on Vercel).
const crypto = require("crypto");

const REPO = process.env.GITHUB_REPO || "apdizalam/portfolio";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const CONTENT_PATH = "data/content.json";
const SESSION_HOURS = 8;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function configured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.GITHUB_TOKEN);
}

// ---- sessions: signed, expiring tokens (no database needed) -------------------
function key() {
  return crypto.createHash("sha256").update("portfolio-admin:" + process.env.ADMIN_PASSWORD).digest();
}
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function createToken() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 }));
  const sig = b64url(crypto.createHmac("sha256", key()).update(payload).digest());
  return payload + "." + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", key()).update(payload).digest());
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function usernameMatches(input) {
  const expected = (process.env.ADMIN_USERNAME || "abdisalam").toLowerCase();
  const a = crypto.createHash("sha256").update(String(input || "").trim().toLowerCase()).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function passwordMatches(input) {
  const a = crypto.createHash("sha256").update(String(input || "")).digest();
  const b = crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res) {
  if (!configured()) {
    send(res, 503, { error: "Admin is not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN in Vercel → Settings → Environment Variables, then redeploy." });
    return false;
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token)) {
    send(res, 401, { error: "Your session has expired. Please log in again." });
    return false;
  }
  return true;
}

// ---- GitHub API -----------------------------------------------------------
async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: options.raw ? "application/vnd.github.raw" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "portfolio-admin",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return options.raw ? text : text ? JSON.parse(text) : {};
}

// ---- validation -----------------------------------------------------------
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isHttp = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(u);

function cleanContent(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid content");
  const skills = (Array.isArray(input.skills) ? input.skills : []).slice(0, 100).map((s) => {
    const name = str(s && s.name, 40);
    const icon = str(s && s.icon, 300);
    if (!name) throw new Error("Every skill needs a name");
    if (icon && !/^[a-z0-9-]{1,40}$/i.test(icon) && !isHttp(icon)) throw new Error(`Bad icon for skill "${name}"`);
    return { name, icon };
  });

  const seen = new Set();
  const projects = (Array.isArray(input.projects) ? input.projects : []).slice(0, 50).map((p) => {
    p = p || {};
    const slug = str(p.slug, 60);
    const title = str(p.title, 100);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Bad project id "${slug}"`);
    if (seen.has(slug)) throw new Error(`Two projects share the id "${slug}"`);
    seen.add(slug);
    if (!title) throw new Error("Every project needs a title");
    const repo = str(p.repo, 100);
    if (repo && !/^[\w.-]+(\/[\w.-]+)?$/.test(repo)) throw new Error(`Bad GitHub repo for "${title}"`);
    const live = str(p.live, 300);
    if (live && !isHttp(live)) throw new Error(`Live link for "${title}" must start with https://`);
    const image = str(p.image, 300);
    if (image && !isHttp(image) && !/^assets\/[\w./-]+$/.test(image)) throw new Error(`Bad image for "${title}"`);
    if (image.includes("..")) throw new Error(`Bad image for "${title}"`);
    const appLink = str(p.appLink, 400);
    if (appLink && !/^https:\/\/[^\s"'<>]+$/i.test(appLink)) throw new Error(`App link for "${title}" must start with https://`);
    const appNote = str(p.appNote, 1000);
    const tags = (Array.isArray(p.tags) ? p.tags : []).map((t) => str(t, 30)).filter(Boolean).slice(0, 12);
    const categories = (Array.isArray(p.categories) ? p.categories : []).map((t) => str(t, 30)).filter(Boolean).slice(0, 5);
    const out = { slug, title, summary: str(p.summary, 400), repo, live, image, tags, categories, date: str(p.date, 30) };
    if (appLink) { out.appLink = appLink; out.appNote = appNote; }
    return out;
  });

  const pr = input.profile && typeof input.profile === "object" ? input.profile : {};
  const linkField = (v, label) => {
    const u = str(v, 300);
    if (u && !/^https:\/\/[^\s"'<>]+$/i.test(u)) throw new Error(`${label} link must start with https://`);
    return u;
  };
  const photo = str(pr.photo, 300);
  if (photo && ((!isHttp(photo) && !/^assets\/[\w./-]+$/.test(photo)) || photo.includes(".."))) throw new Error("Bad profile photo");
  const profile = {
    name: str(pr.name, 80) || "Your Name",
    nameAccent: str(pr.nameAccent, 60),
    title: str(pr.title, 120),
    tagline: str(pr.tagline, 80),
    photo,
    about: str(pr.about, 3000),
    github: linkField(pr.github, "GitHub"),
    linkedin: linkField(pr.linkedin, "LinkedIn"),
  };

  const education = (Array.isArray(input.education) ? input.education : []).slice(0, 20).map((e) => {
    e = e || {};
    const school = str(e.school, 120);
    if (!school) throw new Error("Every education entry needs a school name");
    return { school, dates: str(e.dates, 60), place: str(e.place, 80), degree: str(e.degree, 160) };
  });

  return { profile, education, skills, projects };
}

function cleanUploads(list) {
  if (!Array.isArray(list)) return [];
  if (list.length > 5) throw new Error("Upload at most 5 images at a time");
  return list.map((u) => {
    const path = str(u && u.path, 120);
    if (!/^assets\/(projects|profile)\/[a-z0-9-]+\.(webp|png|jpe?g)$/.test(path)) throw new Error("Bad image file name");
    const data = typeof u.data === "string" ? u.data.replace(/^data:[^,]+,/, "") : "";
    if (!data || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error("Bad image data");
    if ((data.length * 3) / 4 > 3 * 1024 * 1024) throw new Error("Image is too large (max 3 MB)");
    return { path, data };
  });
}

module.exports = {
  REPO, BRANCH, CONTENT_PATH, send, configured, createToken, verifyToken,
  usernameMatches, passwordMatches, requireAuth, gh, cleanContent, cleanUploads,
};
