import Link from "next/link";
import { notFound } from "next/navigation";
import { database } from "../../../../../lib/database.ts";
import { requireStaff } from "../../../../../admin/session.ts";
import { can } from "../../../../../admin/permissions.ts";
import { queueSupplierSync } from "../../../../../admin/actions.ts";
import {
  AdminHeading,
  Stat,
  StatusBadge,
} from "../../../../../components/admin-ui.tsx";
export default async function SupplierDetail({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const staff = await requireStaff("suppliers:read");
  const { id } = { id: (await params).supplierId };
  const s = await database.supplier.findUnique({
    where: { id },
    include: {
      syncStates: true,
      syncRuns: { take: 5, orderBy: { queuedAt: "desc" }, include: { triggeredByStaffUser: { select: { name: true } } } },
      _count: { select: { products: true, variants: true } },
    },
  });
  if (!s) notFound();
  const images = await database.supplierImage.count({
    where: { supplierProduct: { supplierId: id } },
  });
  return (
    <>
      <AdminHeading
        title={s.name}
        description="Read-only supplier connection and sync overview."
      />
      <section className="admin-card">
        <dl className="admin-definition">
          <dt>Connection</dt>
          <dd>{s.connectionType}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge value={s.status} />
          </dd>
          <dt>API base URL</dt>
          <dd>{s.apiBaseUrl ?? "Not configured"}</dd>
        </dl>
        <Link
          className="admin-primary"
          href={`/admin/suppliers/${id}/products`}
        >
          Browse supplier products
        </Link>
      </section>
      <div className="admin-stat-grid">
        <Stat label="Products" value={s._count.products} />
        <Stat label="Variants" value={s._count.variants} />
        <Stat label="Images" value={images} />
      </div>
      <section className="admin-section">
        <h2>Sync state</h2>
        {s.syncStates.map((x) => (
          <article className="admin-card" key={x.id}>
            <strong>{x.resource}</strong>
            <p>
              {x.status} ·{" "}
              {x.lastAttemptedAt?.toLocaleString("en-NZ") ?? "Never attempted"}
            </p>
            {x.errorSummary && <p className="admin-error">{x.errorSummary}</p>}
          </article>
        ))}
      </section>
      <section className="admin-section">
        <div className="admin-card-title"><h2>Synchronization</h2><Link href={`/admin/suppliers/${id}/syncs`}>View full history</Link></div>
        {can(staff.role, "suppliers:write") && <div className="admin-sync-controls">
          <form action={queueSupplierSync.bind(null, id)}><input type="hidden" name="syncType" value="PRODUCTS_INCREMENTAL"/><button>Sync products</button></form>
          <form action={queueSupplierSync.bind(null, id)}><input type="hidden" name="syncType" value="STOCK_PRICES_INCREMENTAL"/><button>Sync stock &amp; prices</button></form>
          <form action={queueSupplierSync.bind(null, id)} className="admin-full-sync"><input type="hidden" name="syncType" value="FULL"/><label className="admin-check"><input type="checkbox" name="confirmed" value="yes" required/>I confirm a full supplier sync</label><button className="admin-primary">Run full sync</button></form>
        </div>}
        <p className="admin-muted">Queued jobs are processed by <code>npm run sync:worker</code>. No supplier orders are created.</p>
        {s.syncRuns.map((run) => <article className="admin-card" key={run.id}><div className="admin-card-title"><strong>{run.syncType.replaceAll("_", " ")}</strong><StatusBadge value={run.status}/></div><p>{run.phase.replaceAll("_", " ")} · Products {run.productCount} · Variants {run.variantCount} · Stock {run.stockUpdatedCount} · Prices {run.priceUpdatedCount}</p><small>{run.triggerType} by {run.triggeredByStaffUser?.name ?? "Development worker"} · {run.queuedAt.toLocaleString("en-NZ")}</small>{run.errorSummary && <p className="admin-error">{run.errorSummary}</p>}</article>)}
      </section>
    </>
  );
}
