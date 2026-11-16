// POST /api/publish  { content, uploads: [{ path, data(base64) }] }
// Writes data/content.json (+ any new images) to GitHub in ONE commit.
// Vercel sees the commit and redeploys the site automatically.
const { send, requireAuth, canPublish, NO_TOKEN, gh, cleanContent, cleanUploads, BRANCH, CONTENT_PATH } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!requireAuth(req, res)) return;
  if (!canPublish()) return send(res, 503, { error: NO_TOKEN });

  let content, uploads;
  try {
    content = cleanContent(req.body && req.body.content);
    uploads = cleanUploads(req.body && req.body.uploads);
  } catch (err) {
    return send(res, 400, { error: err.message });
  }

  try {
    const ref = await gh(`/git/ref/heads/${encodeURIComponent(BRANCH)}`);
    const parentSha = ref.object.sha;
    const parent = await gh(`/git/commits/${parentSha}`);

    const tree = [
      { path: CONTENT_PATH, mode: "100644", type: "blob", content: JSON.stringify(content, null, 2) + "\n" },
    ];
    for (const u of uploads) {
      const blob = await gh(`/git/blobs`, { method: "POST", body: { content: u.data, encoding: "base64" } });
      tree.push({ path: u.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    const newTree = await gh(`/git/trees`, { method: "POST", body: { base_tree: parent.tree.sha, tree } });
    const commit = await gh(`/git/commits`, {
      method: "POST",
      body: { message: "Update portfolio content from admin", tree: newTree.sha, parents: [parentSha] },
    });
    await gh(`/git/refs/heads/${encodeURIComponent(BRANCH)}`, { method: "PATCH", body: { sha: commit.sha } });

    send(res, 200, { ok: true, commit: commit.sha, url: commit.html_url });
  } catch (err) {
    const auth = err.status === 401 || err.status === 403 || err.status === 404;
    send(res, 502, {
      error: auth
        ? "GitHub rejected the request. Check GITHUB_TOKEN in Vercel (Contents: Read and write on the portfolio repo)."
        : "Publishing failed: " + err.message,
    });
  }
};
