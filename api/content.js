// GET /api/content -> latest data/content.json straight from GitHub (admin only)
const { send, requireAuth, gh, BRANCH, CONTENT_PATH } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  if (!requireAuth(req, res)) return;
  try {
    const raw = await gh(`/contents/${CONTENT_PATH}?ref=${encodeURIComponent(BRANCH)}`, { raw: true });
    send(res, 200, { content: JSON.parse(raw) });
  } catch (err) {
    send(res, err.status === 401 ? 502 : 500, {
      error: err.status === 401 || err.status === 403
        ? "GitHub rejected the token. Check GITHUB_TOKEN in Vercel (it needs Contents: Read and write on the portfolio repo)."
        : "Couldn't load content from GitHub: " + err.message,
    });
  }
};
