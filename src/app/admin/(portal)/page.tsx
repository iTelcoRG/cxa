import { database } from "../../../lib/database.ts";
import { requireStaff } from "../../../admin/session.ts";
import {
  AdminHeading,
  Stat,
  StatusBadge,
} from "../../../components/admin-ui.tsx";

export default async function AdminDashboard() {
  await requireStaff("admin:read");
  const [
    quoteGroups,
    productGroups,
    supplierProducts,
    activeVariants,
    sync,
    recent,
  ] = await Promise.all([
    database.quote.groupBy({ by: ["status"], _count: true }),
    database.product.groupBy({ by: ["status"], _count: true }),
    database.supplierProduct.count(),
    database.supplierVariant.count({ where: { active: true } }),
    database.supplierSyncState.findMany({
      where: { supplier: { slug: "premium-apparel" } },
      orderBy: { resource: "asc" },
    }),
    database.quote.findMany({
      take: 6,
      orderBy: { submittedAt: "desc" },
      select: {
        quoteNumber: true,
        customerName: true,
        status: true,
        submittedAt: true,
      },
    }),
  ]);
  const q = Object.fromEntries(quoteGroups.map((x) => [x.status, x._count]));
  const p = Object.fromEntries(productGroups.map((x) => [x.status, x._count]));
  const today = new Date();
  const soon = new Date(today.getTime() + 7 * 86_400_000);
  const [artworkAwaiting, openRevisions, proofsAwaiting, dueSoon, overdue, unresolvedRequirements, draftPurchases] = await Promise.all([
    database.artworkFile.count({ where: { status: "UPLOADED" } }),
    database.artworkRevisionRequest.count({ where: { status: "OPEN" } }),
    database.artworkProof.count({ where: { status: "READY_FOR_CUSTOMER" } }),
    database.productionJob.count({ where: { requiredBy: { gte: today, lte: soon }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    database.productionJob.count({ where: { requiredBy: { lt: today }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    database.supplierRequirement.count({ where: { OR: [{ supplierVariantId: null }, { status: "REQUIRED" }] } }),
    database.supplierPurchaseDraft.count({ where: { status: "DRAFT" } }),
  ]);
  return (
    <>
      <AdminHeading
        title="Dashboard"
        description="CXA catalogue, supplier and quote operations at a glance."
      />
      <section className="admin-section">
        <h2>Operations</h2>
        <div className="admin-stat-grid">
          <Stat label="Artwork awaiting review" value={artworkAwaiting} href="/admin/artwork?status=UPLOADED" />
          <Stat label="Open artwork revisions" value={openRevisions} />
          <Stat label="Proofs awaiting customer" value={proofsAwaiting} href="/admin/proofs?status=READY_FOR_CUSTOMER" />
          <Stat label="Production due soon" value={dueSoon} href="/admin/production?sort=required" />
          <Stat label="Production overdue" value={overdue} href="/admin/production?sort=required" />
          <Stat label="Unresolved supplier requirements" value={unresolvedRequirements} />
          <Stat label="Purchase drafts not ready" value={draftPurchases} href="/admin/purchase-orders" />
        </div>
      </section>
      <section className="admin-section">
        <h2>Quotes</h2>
        <div className="admin-stat-grid">
          {[
            "SUBMITTED",
            "REVIEWING",
            "QUOTED",
            "APPROVED",
            "IN_PRODUCTION",
            "READY",
          ].map((s) => (
            <Stat
              key={s}
              label={s.replaceAll("_", " ")}
              value={q[s] ?? 0}
              href={`/admin/quotes?status=${s}`}
            />
          ))}
        </div>
      </section>
      <section className="admin-section">
        <h2>Catalogue</h2>
        <div className="admin-stat-grid">
          <Stat label="Published" value={p.PUBLISHED ?? 0} />
          <Stat label="Draft" value={p.DRAFT ?? 0} />
          <Stat label="Archived" value={p.ARCHIVED ?? 0} />
        </div>
      </section>
      <section className="admin-section">
        <h2>Premium Apparel</h2>
        <div className="admin-stat-grid">
          <Stat label="Supplier products" value={supplierProducts} />
          <Stat label="Active variants" value={activeVariants} />
          {sync.map((x) => (
            <Stat
              key={x.resource}
              label={`Last ${x.resource.toLowerCase()} sync`}
              value={x.lastAttemptedAt?.toLocaleDateString("en-NZ") ?? "Never"}
            />
          ))}
        </div>
      </section>
      <section className="admin-section">
        <h2>Recent quotes</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((x) => (
                <tr key={x.quoteNumber}>
                  <td>
                    <a href={`/admin/quotes/${x.quoteNumber}`}>
                      {x.quoteNumber}
                    </a>
                  </td>
                  <td>{x.customerName}</td>
                  <td>
                    <StatusBadge value={x.status} />
                  </td>
                  <td>{x.submittedAt.toLocaleDateString("en-NZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
