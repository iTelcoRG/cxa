"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { QuoteLine } from "../quote/types.ts";
import type { QuoteSubmissionResult } from "../quotes/types.ts";
import { useQuoteCart } from "./quote-cart-provider.tsx";

const SUBMISSION_KEY = "cxa_quote_submission_id_v1";

async function submissionKey(lines: QuoteLine[]): Promise<string> {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(lines)),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(SUBMISSION_KEY) ?? "null",
    ) as { key?: unknown; fingerprint?: unknown } | null;
    if (
      existing &&
      typeof existing.key === "string" &&
      /^[0-9a-f-]{36}$/i.test(existing.key) &&
      existing.fingerprint === fingerprint
    ) return existing.key;
  } catch {
    // A malformed browser value is replaced below.
  }
  const key = window.crypto.randomUUID();
  window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify({ key, fingerprint }));
  return key;
}

export function QuoteSubmissionForm({ lines }: { lines: QuoteLine[] }) {
  const router = useRouter();
  const { clearCart } = useQuoteCart();
  const startedAt = useRef(0);
  const [deliveryMethod, setDeliveryMethod] = useState("TO_BE_CONFIRMED");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const quoteUploadReactId = useId();
  const quoteUploadId = useRef(`quote-${quoteUploadReactId.replaceAll(":", "")}`);
  const [quoteArtwork, setQuoteArtwork] = useState<Array<{ clientUploadId: string; token: string; originalFileName: string; mimeType: string; sizeBytes: number; status: "UPLOADED" }>>([]);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || uploadingArtwork) { setErrors(["Wait for the artwork upload to finish before submitting."]); return; }
    setSubmitting(true);
    setErrors([]);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: {
            customerName: value("customerName"),
            businessName: value("businessName"),
            email: value("email"),
            phone: value("phone"),
            requiredBy: value("requiredBy"),
            deliveryMethod,
            deliveryAddress: value("deliveryAddress"),
            customerNotes: value("customerNotes"),
          },
          lines,
          idempotencyKey: await submissionKey(lines),
          website: value("website"),
          startedAt: startedAt.current,
          quoteArtwork,
        }),
      });
      const result = (await response.json()) as QuoteSubmissionResult;
      if (!response.ok || !result.ok) {
        setErrors(result.ok ? ["Quote submission failed."] : result.errors);
        setFieldErrors(result.ok ? {} : (result.fieldErrors ?? {}));
        return;
      }
      clearCart();
      window.localStorage.removeItem(SUBMISSION_KEY);
      router.push(
        `/quote/confirmation/${encodeURIComponent(result.quoteNumber)}?token=${encodeURIComponent(result.confirmationToken)}`,
      );
    } catch {
      setErrors(["We could not submit your quote right now. Your cart has been preserved."]);
    } finally {
      setSubmitting(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[`customer.${field}`]?.[0];

  async function uploadQuoteArtwork(file: File | undefined) { if (!file) return; setUploadingArtwork(true); setErrors([]); try { const form = new FormData(); form.set("file", file); form.set("quoteLineId", quoteUploadId.current); const response = await fetch("/api/artwork/uploads", { method: "POST", body: form }); const result = await response.json() as { ok: boolean; error?: string; artwork?: { token: string; originalFileName: string; mimeType: string; sizeBytes: number } }; if (!response.ok || !result.ok || !result.artwork) { setErrors([result.error ?? "Artwork upload failed."]); return; } setQuoteArtwork((current) => [...current, { clientUploadId: quoteUploadId.current, ...result.artwork!, status: "UPLOADED" }]); } catch { setErrors(["Artwork upload failed. Your quote has been preserved."]); } finally { setUploadingArtwork(false); } }

  return (
    <form className="customer-details-form" id="customer-details" onSubmit={submit}>
      <header>
        <span className="step-label">Step 2 of 2</span>
        <h2>Tell us about your request</h2>
        <p>We&apos;ll use these details only to review and respond to your quote request.</p>
      </header>

      {errors.length ? (
        <div className="form-errors" role="alert">
          <strong>Please check your request:</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}

      <fieldset className="form-section"><legend>Contact details</legend><div className="customer-field-grid">
        <div className="form-field">
          <label htmlFor="customer-name">Name *</label>
          <input aria-describedby="customer-name-error" autoComplete="name" id="customer-name" name="customerName" required />
          {errorFor("customerName") ? <span id="customer-name-error">{errorFor("customerName")}</span> : null}
        </div>
        <div className="form-field">
          <label htmlFor="business-name">Business / organisation</label>
          <input autoComplete="organization" id="business-name" name="businessName" />
        </div>
        <div className="form-field">
          <label htmlFor="customer-email">Email *</label>
          <input aria-describedby="customer-email-error" autoComplete="email" id="customer-email" name="email" required type="email" />
          {errorFor("email") ? <span id="customer-email-error">{errorFor("email")}</span> : null}
        </div>
        <div className="form-field">
          <label htmlFor="customer-phone">Phone</label>
          <input autoComplete="tel" id="customer-phone" name="phone" type="tel" />
        </div>
      </div></fieldset>
      <fieldset className="form-section"><legend>Order requirements</legend><div className="customer-field-grid">
        <div className="form-field">
          <label htmlFor="required-by">Requested-by date</label>
          <input aria-describedby="required-by-note required-by-error" id="required-by" name="requiredBy" type="date" />
          {errorFor("requiredBy") ? <span id="required-by-error">{errorFor("requiredBy")}</span> : null}
        </div>
        <div className="form-field">
          <label htmlFor="delivery-method">Delivery method *</label>
          <select id="delivery-method" name="deliveryMethod" onChange={(event) => setDeliveryMethod(event.target.value)} value={deliveryMethod}>
            <option value="TO_BE_CONFIRMED">To be confirmed</option><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option>
          </select>
        </div>
      </div>
      <p className="requested-date-note" id="required-by-note">
        Requested dates are subject to artwork approval, product availability and production capacity.
      </p>

      {deliveryMethod === "DELIVERY" ? (
        <div className="form-field full-field">
          <label htmlFor="delivery-address">Delivery address *</label>
          <textarea
            aria-describedby="delivery-address-error"
            autoComplete="street-address"
            id="delivery-address"
            name="deliveryAddress"
            required
            rows={3}
          />
          {errorFor("deliveryAddress") ? <span id="delivery-address-error">{errorFor("deliveryAddress")}</span> : null}
        </div>
      ) : (
        <input name="deliveryAddress" type="hidden" value="" />
      )}</fieldset>

      <fieldset className="form-section"><legend>Notes</legend><div className="form-field full-field">
        <label htmlFor="quote-notes">Additional notes</label>
        <span className="field-help">Tell us about your deadline, artwork or any special requirements.</span>
        <textarea id="quote-notes" maxLength={1000} name="customerNotes" rows={4} />
      </div></fieldset>
      <fieldset className="form-section"><legend>General quote artwork (optional)</legend><p className="field-help">Use this for artwork that applies to the whole quote. Decoration-specific artwork appears with each configuration.</p><input accept=".png,.jpg,.jpeg,.pdf,.svg,image/png,image/jpeg,application/pdf,image/svg+xml" disabled={uploadingArtwork} onChange={(event) => { void uploadQuoteArtwork(event.target.files?.[0]); event.target.value = ""; }} type="file" />{uploadingArtwork ? <p role="status">Uploading artwork…</p> : null}{quoteArtwork.length ? <ul>{quoteArtwork.map((file) => <li key={file.token}>{file.originalFileName} <button onClick={() => setQuoteArtwork((current) => current.filter((item) => item.token !== file.token))} type="button">Remove</button></li>)}</ul> : null}</fieldset>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input autoComplete="off" id="website" name="website" tabIndex={-1} />
      </div>

      <button className="primary-button submit-quote-button" disabled={submitting} type="submit">
        {submitting ? "Submitting quote…" : "Request quote"}
      </button>
      <p className="submission-note"><strong>No payment will be taken.</strong><br />CXA will review availability, artwork requirements and final pricing.</p>
    </form>
  );
}
