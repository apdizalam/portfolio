"use client";
import { useState } from "react";

const CONTACT_EMAIL = "abdisalammoh8@gmail.com";

export default function ContactForm({ linkedin }: { linkedin: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [mailto, setMailto] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (data.website) return; // bot

    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const message = (data.message || "").trim();
    if (!name || !email || !message) { setState("error"); setMailto(""); return setMsg("Please fill in your name, email and description."); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setState("error"); setMailto(""); return setMsg("Please enter a valid email address."); }

    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website: "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 400) { setState("error"); setMailto(""); return setMsg(json.error || "Please check the form."); }
      if (!res.ok) throw new Error(json.error || "failed");
      form.reset();
      setState("sent");
      setMsg("Thanks! Your message has been sent. I'll get back to you soon.");
    } catch {
      // Backup: open the visitor's email app with the message already written
      const link = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Portfolio message from ${name}`)}&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`;
      setState("error");
      setMailto(link);
      setMsg("The form couldn't send right now. ");
      try { window.location.href = link; } catch {}
    }
  }

  return (
    <div className="card contact">
      <span className="contact__badge">Contact</span>
      <h3 className="contact__title">Get in Touch</h3>
      <p>
        Want to work together or just say hi? Send me a message below
        {linkedin ? <> or reach out <a href={linkedin} target="_blank" rel="noopener">on LinkedIn</a></> : null}, and I&apos;ll respond as soon as I can.
      </p>
      <form className="contact-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" type="text" autoComplete="name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" name="email" type="email" autoComplete="email" required maxLength={150} />
        </div>
        <div className="field field--full">
          <label htmlFor="cf-message">Description</label>
          <textarea id="cf-message" name="message" rows={5} required maxLength={5000} />
        </div>
        <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="field--full contact-form__footer">
          <button type="submit" className="btn btn--solid contact-form__submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Send message"}
          </button>
          <p className={`form-status${state === "sent" ? " is-success" : state === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
            {msg}
            {mailto && <><a href={mailto} style={{ textDecoration: "underline" }}>Send it from your email app instead</a> (your message is already filled in).</>}
          </p>
        </div>
      </form>
    </div>
  );
}
