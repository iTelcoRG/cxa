import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { database } from "../../../../lib/database.ts";
import { requireStaff } from "../../../../admin/session.ts";
import {
  AdminHeading,
  Empty,
  Pager,
  StatusBadge,
} from "../../../../components/admin-ui.tsx";
import { safeSearch } from "../../../../admin/validation.ts";
export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff("catalogue:read");
  const sp = await searchParams;
  const q = safeSearch.parse(typeof sp.q === "string" ? sp.q : "");
  const status = z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .optional()
    .catch(undefined)
    .parse(sp.status);
  const page = Math.max(1, z.coerce.number().int().catch(1).parse(sp.page));
  const take = 25;
  const rows = await database.product.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    take: take + 1,
    skip: (page - 1) * take,
    orderBy: { updatedAt: "desc" },
    include: {
      brand: true,
      category: true,
      supplierLinks: { select: { id: true } },
    },
  });
  const hasNext = rows.length > take;
  rows.splice(take);
  return (
    <>
      <AdminHeading
        title="CXA products"
        description="Customer-facing catalogue records. Supplier source data remains separate."
      />
      <form className="admin-filters">
        <input name="q" defaultValue={q} placeholder="Product name" />
        <select name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option>DRAFT</option>
          <option>PUBLISHED</option>
          <option>ARCHIVED</option>
        </select>
        <button>Apply</button>
      </form>
      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Decoration</th>
                <th>Suppliers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    {x.primaryImage ? (
                      <Image
                        src={x.primaryImage}
                        alt=""
                        width={52}
                        height={64}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${x.id}`}>{x.name}</Link>
                  </td>
                  <td>{x.brand?.name ?? "—"}</td>
                  <td>{x.category?.name ?? "—"}</td>
                  <td>
                    <StatusBadge value={x.status} />
                  </td>
                  <td>
                    {[x.featured && "Featured", x.newProduct && "New"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>
                    {[
                      x.screenPrint && "Screen",
                      x.embroidery && "Embroidery",
                      x.dtf && "DTF",
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>{x.supplierLinks.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No CXA products match these filters.</Empty>
      )}
      <Pager
        page={page}
        hasNext={hasNext}
        base={`/admin/products?q=${encodeURIComponent(q)}&status=${status ?? ""}`}
      />
    </>
  );
}
