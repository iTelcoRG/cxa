"use client";

import { useEffect, useState } from "react";
import { reviewers, reviewStatuses, type ReviewPage, type ReviewStatus, type SavedReview } from "../../reviews/shared.ts";
import styles from "./review.module.css";

export function ReviewBoard() {
  const [reviewer, setReviewer] = useState("");
  const [loaded, setLoaded] = useState("");
  const [pages, setPages] = useState<ReviewPage[]>([]);
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(0);

  useEffect(() => {
    if (!reviewer) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/reviews?reviewer=${encodeURIComponent(reviewer)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPages(data.pages); setReviews(data.reviews); setLoaded(reviewer);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load reviews.");
      }
    }
    void load();
    return () => controller.abort();
  }, [reviewer, attempt]);

  useEffect(() => {
    if (!dirty.size) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function markDirty(path: string, changed: boolean) {
    setDirty(previous => { const next = new Set(previous); if (changed) next.add(path); else next.delete(path); return next; });
  }

  return <div className={styles.board}>
    <header className={styles.heading}><p className={styles.eyebrow}>CXA / WEBSITE REVIEW</p><h1>Help us get every page right.</h1>
      <p>Choose your name, open a page, then leave your comments and save. Select “Signed off” when you’re happy with a page.</p>
      <p className={styles.note}>This is a shared review link without a login. Everyone with the link can view and edit reviews under any of the three names.</p>
    </header>
    <div className={styles.toolbar}>
      <label htmlFor="reviewer">Your name<select id="reviewer" value={reviewer} disabled={saving > 0} onChange={event => {
        if (dirty.size && !window.confirm("Discard your unsaved changes and switch reviewer?")) return;
        setReviewer(event.target.value); setLoaded(""); setDirty(new Set()); setError("");
      }}><option value="">Select your name</option>{reviewers.map(name => <option key={name}>{name}</option>)}</select></label>
      {loaded === reviewer && reviewer && <p>{reviews.filter(review => review.status === "APPROVED" && pages.some(page => page.path === review.pagePath)).length} of {pages.length} pages signed off{dirty.size ? ` · ${dirty.size} unsaved` : ""}</p>}
    </div>
    {error ? <div role="alert" className={styles.error}>{error} <button type="button" onClick={() => { setError(""); setAttempt(n => n + 1); }}>Retry</button></div> : reviewer && loaded !== reviewer ? <p role="status">Loading your saved reviews…</p> : null}
    {!reviewer && <p>Select your name to start reviewing or return to your saved comments.</p>}
    {reviewer && loaded === reviewer && <div className={styles.cards}>{pages.map(page => <ReviewCard key={`${reviewer}:${page.path}`} page={page} reviewer={reviewer} saved={reviews.find(review => review.pagePath === page.path)} onDirty={markDirty} onSaving={delta => setSaving(n => n + delta)} onSaved={review => setReviews(previous => [...previous.filter(item => item.pagePath !== review.pagePath), review])} />)}</div>}
  </div>;
}

function ReviewCard({ page, reviewer, saved, onDirty, onSaving, onSaved }: {
  page: ReviewPage; reviewer: string; saved?: SavedReview;
  onDirty: (path: string, changed: boolean) => void; onSaving: (delta: number) => void; onSaved: (review: SavedReview) => void;
}) {
  const [comment, setComment] = useState(saved?.comment ?? "");
  const [status, setStatus] = useState<ReviewStatus>(saved?.status ?? "NOT_REVIEWED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = comment !== (saved?.comment ?? "") || status !== (saved?.status ?? "NOT_REVIEWED");
  function edit(nextComment: string, nextStatus: ReviewStatus) {
    setComment(nextComment); setStatus(nextStatus); setError("");
    onDirty(page.path, nextComment !== (saved?.comment ?? "") || nextStatus !== (saved?.status ?? "NOT_REVIEWED"));
  }
  async function save() {
    setBusy(true); onSaving(1); setError("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewer, pagePath: page.path, comment, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSaved(data.review); onDirty(page.path, false);
    } catch (e) { setError(e instanceof Error ? e.message : "Your review was not saved. Please try again."); }
    finally { setBusy(false); onSaving(-1); }
  }
  return <section className={styles.card}>
    <div className={styles.cardHeading}><h2>{page.title}</h2><a href={page.path} target="_blank" rel="noopener noreferrer">Open page ↗<span className={styles.srOnly}> (opens in a new tab)</span></a></div>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy}>
        <label>Comments<textarea rows={4} maxLength={5000} value={comment} onChange={event => edit(event.target.value, status)} placeholder="What works well? What needs changing?" /></label>
        <div className={styles.actions}><label>Review status<select value={status} onChange={event => edit(comment, event.target.value as ReviewStatus)}>{Object.entries(reviewStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="submit" disabled={!changed && !!saved}>{busy ? "Saving…" : "Save review"}</button></div>
      </fieldset>
      <p role="status" className={styles.note}>{changed ? "Unsaved changes" : saved ? `Saved for ${reviewer} · ${new Date(saved.updatedAt).toLocaleString()}` : "No review saved yet"}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </section>;
}
