import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/server";

const CONTACT_TO = process.env.CONTACT_TO || "abdisalammoh8@gmail.com";
const FROM = process.env.CONTACT_FROM || "Portfolio <onboarding@resend.dev>";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Accept the Resend key from RESEND_API_KEY, or a "re_..." key saved under another name.
function resendKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY.trim();
  const found = Object.values(process.env).find((v) => typeof v === "string" && /^re_[A-Za-z0-9_]{16,}$/.test(v.trim()));
  return found?.trim() || "";
}

async function sendEmail(name: string, email: string, message: string) {
  const key = resendKey();
  if (!key) return false;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
      <h2 style="margin:0 0 12px">New message from your portfolio</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Email:</b> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
      <p><b>Description:</b></p>
      <p style="white-space:pre-wrap;background:#f4f6f8;padding:12px;border-radius:8px">${esc(message)}</p>
      <p style="color:#666;font-size:13px">Reply to this email to answer ${esc(name)} directly.</p>
    </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [CONTACT_TO],
      reply_to: email,
      subject: `New portfolio message from ${name}`,
      html,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    }),
  });
  if (!r.ok) console.error("Resend error", r.status, (await r.text()).slice(0, 300));
  return r.ok;
}

async function saveMessage(name: string, email: string, message: string) {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from("messages").insert({ name, email, message });
  if (error) console.error("Saving message failed:", error.message);
  return !error;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const name = clean(body.name, 100);
  const email = clean(body.email, 150);
  const message = clean(body.message, 5000);
  if (!name || !email || !message) return NextResponse.json({ error: "Please fill in your name, email and description." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const [saved, emailed] = await Promise.all([
    saveMessage(name, email, message).catch(() => false),
    sendEmail(name, email, message).catch(() => false),
  ]);

  if (!saved && !emailed) return NextResponse.json({ error: "The message couldn't be sent right now." }, { status: 502 });
  return NextResponse.json({ ok: true, saved, emailed });
}
