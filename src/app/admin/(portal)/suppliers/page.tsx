import Link from "next/link";
import { database } from "../../../../lib/database.ts";
import { requireStaff } from "../../../../admin/session.ts";
import { AdminHeading, StatusBadge } from "../../../../components/admin-ui.tsx";
export default async function Suppliers() {
  await requireStaff("suppliers:read");
  const rows = await database.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true, variants: true } },
      syncStates: true,
    },
  });
  return (
    <>
      <AdminHeading
        title="Suppliers"
        description="Connections and synchronization status. Credentials are environment-managed and never shown."
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Connection</th>
              <th>Status</th>
              <th>Products</th>
              <th>Variants</th>
              <th>Products sync</th>
              <th>Stock sync</th>
              <th>Prices sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const sync = Object.fromEntries(
                x.syncStates.map((s) => [s.resource, s]),
              );
              return (
                <tr key={x.id}>
                  <td>
                    <Link href={`/admin/suppliers/${x.id}`}>{x.name}</Link>
                  </td>
                  <td>{x.connectionType}</td>
                  <td>
                    <StatusBadge value={x.status} />
                  </td>
                  <td>{x._count.products}</td>
                  <td>{x._count.variants}</td>
                  {["PRODUCTS", "STOCK", "PRICES"].map((s) => (
                    <td key={s}>
                      {sync[s]?.lastAttemptedAt?.toLocaleString("en-NZ") ??
                        "Never"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
