// GET /api/content -> latest data/content.json (admin only)
// Uses the GitHub API when GITHUB_TOKEN is set; otherwise reads the public repo file.
const { send, requireAuth, gh, canPublish, REPO, BRANCH, CONTENT_PATH } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  if (!requireAuth(req, res)) return;
  try {
    let raw;
    if (canPublish()) {
      raw = await gh(`/contents/${CONTENT_PATH}?ref=${encodeURIComponent(BRANCH)}`, { raw: true });
    } else {
      const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(BRANCH)}/${CONTENT_PATH}?t=${Date.now()}`);
      if (!r.ok) throw Object.assign(new Error("raw " + r.status), { status: r.status });
      raw = await r.text();
    }
    send(res, 200, { content: JSON.parse(raw), canPublish: canPublish() });
  } catch (err) {
    send(res, err.status === 401 || err.status === 403 ? 502 : 500, {
      error: err.status === 401 || err.status === 403
        ? "GitHub rejected the token. Check GITHUB_TOKEN in Vercel (it needs Contents: Read and write on the portfolio repo)."
        : "Couldn't load content from GitHub: " + err.message,
    });
  }
};
