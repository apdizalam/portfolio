// POST /api/login  { username, password } -> { token }
const { send, configured, NOT_CONFIGURED, createToken, usernameMatches, passwordMatches } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!configured()) {
    return send(res, 503, { error: NOT_CONFIGURED });
  }
  const body = req.body || {};
  const userOk = usernameMatches(body.username);
  const passOk = passwordMatches(body.password);
  if (!userOk || !passOk) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return send(res, 401, { error: "Wrong username or password." });
  }
  send(res, 200, { token: createToken() });
};
