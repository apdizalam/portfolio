// Local server for the portfolio (works like Vercel: clean URLs + /api functions).
// Run:  node dev-server.js        then open http://localhost:3000  (admin: /admin)
//
// Admin login comes from .env.local (never committed):
//   ADMIN_USERNAME=...
//   ADMIN_PASSWORD=...
//   GITHUB_TOKEN=...   (optional locally: if missing, the GitHub CLI login is used)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

// load .env.local
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.GITHUB_TOKEN) {
  try {
    process.env.GITHUB_TOKEN = execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch (e) { /* admin will show "not set up" */ }
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(url.pathname);

  if (p.startsWith("/api/")) {
    const name = p.slice(5).replace(/[^a-z]/g, "");
    const file = path.join(ROOT, "api", name + ".js");
    if (!name || name.startsWith("_") || !fs.existsSync(file)) { res.statusCode = 404; return res.end("Not found"); }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    try { return await require(file)(req, res); }
    catch (err) { console.error(err); res.statusCode = 500; return res.end("Server error"); }
  }

  if (p === "/") p = "/index.html";
  let fp = path.join(ROOT, p);
  if (!fs.existsSync(fp) && fs.existsSync(fp + ".html")) fp += ".html";
  const blocked = /[\\/](\.env|\.git|api)([\\/.]|$)/.test(fp.slice(ROOT.length));
  if (blocked || !fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  res.setHeader("Content-Type", TYPES[path.extname(fp).toLowerCase()] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => {
  console.log(`Portfolio running:  http://localhost:${PORT}`);
  console.log(`Admin login:        http://localhost:${PORT}/admin`);
  if (!process.env.ADMIN_PASSWORD) console.log("(Set ADMIN_USERNAME / ADMIN_PASSWORD in .env.local to use the admin page.)");
});
