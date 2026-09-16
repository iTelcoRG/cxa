"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ENQUIRY_SUBJECT_MAX_LENGTH } from "../contact/subject.ts";

export function ContactEnquiryForm({ initialSubject }: { initialSubject: string }) {
  const [subject, setSubject] = useState(initialSubject);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error || sent) status.current?.focus(); }, [error, sent]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(""); setFields({});
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (response.ok && result.success === true) setSent(true);
      else { setError(result.error || "We couldn’t send your enquiry. Please try again."); setFields(result.fields || {}); }
    } catch { setError("We couldn’t connect. Your details are still here; please try again."); }
    finally { setPending(false); }
  }
  return <section id="contact-form" className="contact-enquiry" aria-labelledby="contact-enquiry-title">
    <h2 id="contact-enquiry-title">Send us an enquiry</h2>
    {sent ? <p ref={status} tabIndex={-1} role="status">Your enquiry has been sent to CXA. Our team will reply by email.</p> : <form onSubmit={submit} aria-busy={pending}>
      <div className="enquiry-fields">
        <div className="enquiry-field"><label htmlFor="enquiry-name">Name</label><input id="enquiry-name" name="name" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? "enquiry-name-error" : undefined}/>{fields.name && <p className="enquiry-field-error" id="enquiry-name-error">{fields.name[0]}</p>}</div>
        <div className="enquiry-field"><label htmlFor="enquiry-email">Email</label><input id="enquiry-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? "enquiry-email-error" : undefined}/>{fields.email && <p className="enquiry-field-error" id="enquiry-email-error">{fields.email[0]}</p>}</div>
      </div>
      <div className="enquiry-field"><label htmlFor="enquiry-subject">Subject</label><input id="enquiry-subject" name="subject" type="text" required maxLength={ENQUIRY_SUBJECT_MAX_LENGTH} placeholder="Product question, account enquiry or quote follow-up" value={subject} onChange={event => setSubject(event.target.value)} aria-invalid={Boolean(fields.subject)} aria-describedby={fields.subject ? "enquiry-subject-error" : undefined}/>{fields.subject && <p className="enquiry-field-error" id="enquiry-subject-error">{fields.subject[0]}</p>}</div>
      <div className="enquiry-field"><label htmlFor="enquiry-message">Your enquiry</label><textarea id="enquiry-message" name="message" rows={5} required minLength={10} maxLength={5000} aria-invalid={Boolean(fields.message)} aria-describedby={fields.message ? "enquiry-message-error" : undefined}/>{fields.message && <p className="enquiry-field-error" id="enquiry-message-error">{fields.message[0]}</p>}</div>
      <div className="enquiry-honeypot" aria-hidden="true"><label htmlFor="enquiry-website">Leave this blank<input id="enquiry-website" name="website" tabIndex={-1} autoComplete="off"/></label></div>
      {error && <p ref={status} tabIndex={-1} className="enquiry-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}</button>
    </form>}
  </section>;
}
