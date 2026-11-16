// POST /api/contact  { name, email, message, website(honeypot) }
// Sends the visitor's message to your Gmail through Resend (https://resend.com).
// Needs RESEND_API_KEY in Vercel. The Resend account must use the same email as CONTACT_TO.
const { send } = require("./_lib");

const CONTACT_TO = process.env.CONTACT_TO || "abdisalammoh8@gmail.com";
const FROM = process.env.CONTACT_FROM || "Portfolio <onboarding@resend.dev>";

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!process.env.RESEND_API_KEY) return send(res, 503, { error: "Email sending isn't set up yet." });

  const body = req.body || {};
  if (body.website) return send(res, 200, { ok: true }); // bot filled the hidden field

  const name = clean(body.name, 100);
  const email = clean(body.email, 150);
  const message = clean(body.message, 5000);
  if (!name || !email || !message) return send(res, 400, { error: "Please fill in your name, email and description." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Please enter a valid email address." });

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
      <h2 style="margin:0 0 12px">New message from your portfolio</h2>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p><b>Description:</b></p>
      <p style="white-space:pre-wrap;background:#f4f6f8;padding:12px;border-radius:8px">${escapeHtml(message)}</p>
      <p style="color:#666;font-size:13px">Reply to this email to answer ${escapeHtml(name)} directly.</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [CONTACT_TO],
        reply_to: email,
        subject: `New portfolio message from ${name}`,
        html,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend error", r.status, detail.slice(0, 300));
      return send(res, 502, { error: "The message couldn't be sent right now." });
    }
    send(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    send(res, 502, { error: "The message couldn't be sent right now." });
  }
};
