import Link from "next/link";
import { z } from "zod";
import { database } from "../../../../lib/database.ts";
import {
  AdminHeading,
  Empty,
  Pager,
  StatusBadge,
} from "../../../../components/admin-ui.tsx";
import { safeSearch } from "../../../../admin/validation.ts";
import { requireStaff } from "../../../../admin/session.ts";
const statuses = [
  "SUBMITTED",
  "REVIEWING",
  "QUOTED",
  "APPROVED",
  "DECLINED",
  "IN_PRODUCTION",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff("quotes:read");
  const sp = await searchParams;
  const q = safeSearch.parse(typeof sp.q === "string" ? sp.q : "");
  const status = z.enum(statuses).optional().catch(undefined).parse(sp.status);
  const sort = z
    .enum(["newest", "oldest", "number"])
    .catch("newest")
    .parse(sp.sort);
  const page = Math.max(1, z.coerce.number().int().catch(1).parse(sp.page));
  const take = 25;
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { quoteNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { businessName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const rows = await database.quote.findMany({
    where,
    take: take + 1,
    skip: (page - 1) * take,
    orderBy:
      sort === "oldest"
        ? { submittedAt: "asc" }
        : sort === "number"
          ? { quoteNumber: "asc" }
          : { submittedAt: "desc" },
    select: {
      quoteNumber: true,
      customerName: true,
      businessName: true,
      status: true,
      submittedAt: true,
      lines: { select: { totalQuantity: true } },
    },
  });
  const hasNext = rows.length > take;
  rows.length = Math.min(rows.length, take);
  return (
    <>
      <AdminHeading
        title="Quotes"
        description="Review customer quote requests without exposing supplier pricing."
      />
      <form className="admin-filters">
        <input
          name="q"
          defaultValue={q}
          placeholder="Quote, customer, business or email"
        />
        <select name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {statuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="number">Quote number</option>
        </select>
        <button>Apply</button>
      </form>
      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quote</th>
                <th>Customer</th>
                <th>Business</th>
                <th>Status</th>
                <th>Configurations</th>
                <th>Garments</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.quoteNumber}>
                  <td>
                    <Link href={`/admin/quotes/${x.quoteNumber}`}>
                      {x.quoteNumber}
                    </Link>
                  </td>
                  <td>{x.customerName}</td>
                  <td>{x.businessName ?? "—"}</td>
                  <td>
                    <StatusBadge value={x.status} />
                  </td>
                  <td>{x.lines.length}</td>
                  <td>{x.lines.reduce((n, l) => n + l.totalQuantity, 0)}</td>
                  <td>{x.submittedAt.toLocaleDateString("en-NZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No quotes match these filters.</Empty>
      )}
      <Pager
        page={page}
        hasNext={hasNext}
        base={`/admin/quotes?q=${encodeURIComponent(q)}&status=${status ?? ""}&sort=${sort}`}
      />
    </>
  );
}
