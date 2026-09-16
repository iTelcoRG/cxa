import { notFound } from "next/navigation";
import Image from "next/image";
import { database } from "../../../../../lib/database.ts";
import { requireStaff } from "../../../../../admin/session.ts";
import { can } from "../../../../../admin/permissions.ts";
import {
  quoteTransitions,
  type AdminQuoteStatus,
} from "../../../../../admin/quote-workflow.ts";
import {
  addInternalNote,
  resendQuoteNotification,
  updateArtworkStatus,
  updateQuoteStatus,
} from "../../../../../admin/actions.ts";
import {
  AdminHeading,
  StatusBadge,
} from "../../../../../components/admin-ui.tsx";
import { QuoteOperations } from "../../../../../components/quote-operations.tsx";
import { WorkflowTracker } from "../../../../../components/workflow-tracker.tsx";
import { quoteOperationalExceptions } from "../../../../../operations/hardening.ts";
import { quoteActivity } from "../../../../../operations/activity.ts";
export default async function QuoteDetail({
  params,
}: {
  params: Promise<{ quoteNumber: string }>;
}) {
  const staff = await requireStaff("quotes:read");
  const { quoteNumber } = await params;
  const quote = await database.quote.findUnique({
    where: { quoteNumber },
    include: {
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { sizes: true, decorations: true },
      },
      events: {
        orderBy: { createdAt: "asc" },
        include: { staffUser: { select: { name: true } } },
      },
      internalNotes: {
        orderBy: { createdAt: "asc" },
        include: { staffUser: { select: { name: true } } },
      },
      artworkFiles: { orderBy: { uploadedAt: "asc" }, include: { quoteLine: { select: { productNameSnapshot: true } }, decoration: { select: { locationLabel: true, methodLabel: true } } } },
      workflowEvents: { orderBy: { createdAt: "asc" }, include: { staffUser: { select: { name: true } } } },
      revisionRequests: { orderBy: { createdAt: "desc" } },
      artworkProofs: { orderBy: [{ decorationId: "asc" }, { version: "desc" }], include: { decoration: { select: { locationLabel: true } } } },
      productionJob: true,
      supplierRequirements: true,
      purchaseDrafts: true,
      notifications: { orderBy: { attemptedAt: "desc" }, take: 25 },
    },
  });
  if (!quote) notFound();
  const writable = can(staff.role, "quotes:write");
  const transitions = quoteTransitions[quote.status as AdminQuoteStatus];
  const exceptions = await quoteOperationalExceptions(quote.id);
  const activity = await quoteActivity(quote.id);
  return (
    <>
      <AdminHeading
        title={quote.quoteNumber}
        description={`Submitted ${quote.submittedAt.toLocaleString("en-NZ")}`}
      />
      <section className="admin-card admin-quote-header">
        <StatusBadge value={quote.status} />
        {writable && transitions.length > 0 && (
          <form action={updateQuoteStatus.bind(null, quote.id)}>
            <select name="status" required>
              {transitions.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button className="admin-primary">Update status</button>
          </form>
        )}
      </section>
      {exceptions.length > 0 && <section className="admin-card" role="status"><h2>Operational warnings</h2><ul>{exceptions.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
      <WorkflowTracker current={quote.workflowStage} />
      <QuoteOperations quote={quote} writable={writable} />
      <section className="admin-card"><h2>Notification history</h2>{quote.notifications.length ? <ol className="admin-timeline">{quote.notifications.map((delivery) => <li key={delivery.id}><strong>{delivery.type.replaceAll("_", " ")}</strong><span>{delivery.recipientType} · {delivery.status}</span><small>{delivery.attemptedAt.toLocaleString("en-NZ")}{delivery.safeErrorSummary ? ` · ${delivery.safeErrorSummary}` : ""}</small></li>)}</ol> : <p>No durable notification attempts recorded yet.</p>}</section>
      <section className="admin-card"><h2>Unified activity</h2><ol className="admin-timeline">{activity.map((event) => <li key={event.id}><strong>{event.type.replaceAll("_", " ")}</strong><span>{event.summary}</span><small>{event.at.toLocaleString("en-NZ")}</small></li>)}</ol></section>
      <section className="admin-section"><h2>Artwork</h2>{quote.artworkFiles.length ? <div className="admin-stack">{quote.artworkFiles.map((artwork) => <article className="admin-card" key={artwork.id}><h3>{artwork.originalFileName}</h3><dl className="admin-definition"><dt>Configuration</dt><dd>{artwork.quoteLine?.productNameSnapshot ?? "Whole quote"}</dd><dt>Decoration</dt><dd>{artwork.decoration ? `${artwork.decoration.locationLabel} — ${artwork.decoration.methodLabel}` : "General"}</dd><dt>Type</dt><dd>{artwork.mimeType}</dd><dt>Size</dt><dd>{Math.ceil(artwork.sizeBytes / 1024)} KB</dd><dt>Uploaded</dt><dd>{artwork.uploadedAt.toLocaleString("en-NZ")}</dd><dt>Status</dt><dd><StatusBadge value={artwork.status} /></dd><dt>Scan</dt><dd>{artwork.scanStatus.replaceAll("_", " ")}</dd></dl><a className="admin-primary" href={`/api/admin/artwork/${artwork.id}/download`}>Download</a>{writable ? <form action={updateArtworkStatus.bind(null, artwork.id)}><label>Status<select name="status" defaultValue={artwork.status === "UPLOADED" ? "APPROVED" : artwork.status}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option><option value="ARCHIVED">Archive</option></select></label><label>Staff note<textarea maxLength={2000} name="staffNote" defaultValue={artwork.staffNote ?? ""} /></label><label>Rejection reason<textarea maxLength={1000} name="rejectionReason" defaultValue={artwork.rejectionReason ?? ""} /></label><button>Update artwork</button></form> : null}</article>)}</div> : <p>No artwork was supplied.</p>}</section>
      <div className="admin-two-column">
        <section className="admin-card">
          <h2>Customer</h2>
          <dl className="admin-definition">
            <dt>Name</dt>
            <dd>{quote.customerName}</dd>
            <dt>Business</dt>
            <dd>{quote.businessName ?? "Not supplied"}</dd>
            <dt>Email</dt>
            <dd>{quote.email}</dd>
            <dt>Phone</dt>
            <dd>{quote.phone ?? "Not supplied"}</dd>
            <dt>Required by</dt>
            <dd>
              {quote.requiredBy?.toLocaleDateString("en-NZ") ?? "Not specified"}
            </dd>
            <dt>Delivery</dt>
            <dd>{quote.deliveryMethod ?? "Not specified"}</dd>
            <dt>Address</dt>
            <dd>{quote.deliveryAddress ?? "Not supplied"}</dd>
          </dl>
        </section>
        <section className="admin-card">
          <h2>Customer notes</h2>
          <p className="admin-prewrap">
            {quote.customerNotes ?? "No additional notes."}
          </p>
        </section>
      </div>
      <section className="admin-section">
        <h2>Configurations</h2>
        <div className="admin-stack">
          {quote.lines.map((line) => (
            <article className="admin-card admin-line" key={line.id}>
              {line.imageUrl && (
                <Image src={line.imageUrl} alt="" width={120} height={150} />
              )}
              <div>
                <h3>{line.productNameSnapshot}</h3>
                <p>
                  {[line.brandSnapshot, line.categorySnapshot]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p>
                  <strong>Colour:</strong> {line.colourDescription}
                </p>
                <p>
                  <strong>Sizes:</strong>{" "}
                  {line.sizes
                    .map((x) => `${x.size} × ${x.quantity}`)
                    .join(", ")}
                </p>
                <p>
                  <strong>Total:</strong> {line.totalQuantity}
                </p>
                {line.decorations.map((x) => (
                  <p key={x.id}>
                    <strong>{x.locationLabel}:</strong> {x.methodLabel}
                    {x.customerNote ? ` — ${x.customerNote}` : ""}
                  </p>
                ))}
                {line.customerNotes && (
                  <p className="admin-prewrap">
                    <strong>Configuration note:</strong> {line.customerNotes}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="admin-two-column">
        <section className="admin-card">
          <h2>Internal notes</h2>
          {quote.internalNotes.map((n) => (
            <article className="admin-note" key={n.id}>
              <p>{n.body}</p>
              <small>
                {n.staffUser.name} · {n.createdAt.toLocaleString("en-NZ")}
              </small>
            </article>
          ))}
          {writable && (
            <form action={addInternalNote.bind(null, quote.id)}>
              <textarea
                name="body"
                maxLength={4000}
                required
                placeholder="Plain-text internal note"
              />
              <button className="admin-primary">Add note</button>
            </form>
          )}
        </section>
        <section className="admin-card">
          <h2>Event history</h2>
          <ol className="admin-timeline">
            {quote.events.map((e) => (
              <li key={e.id}>
                <strong>{e.eventType.replaceAll("_", " ")}</strong>
                <span>{e.message ?? ""}</span>
                <small>
                  {e.staffUser?.name ?? "System"} ·{" "}
                  {e.createdAt.toLocaleString("en-NZ")}
                </small>
              </li>
            ))}
          </ol>
          {writable && (
            <form
              action={resendQuoteNotification.bind(null, quote.id)}
              className="admin-inline"
            >
              <select name="target">
                <option value="customer">Customer acknowledgement</option>
                <option value="staff">Staff notification</option>
              </select>
              <button>Resend</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
