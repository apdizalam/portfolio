// POST /api/login  { password } -> { token }
const { send, configured, createToken, passwordMatches } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!configured()) {
    return send(res, 503, { error: "Admin is not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN in Vercel → Settings → Environment Variables, then redeploy." });
  }
  const password = req.body && req.body.password;
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return send(res, 401, { error: "Wrong password." });
  }
  send(res, 200, { token: createToken() });
};
