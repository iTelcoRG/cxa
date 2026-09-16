import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { z } from "zod";
import { database } from "../../../../../../lib/database.ts";
import { requireStaff } from "../../../../../../admin/session.ts";
import {
  AdminHeading,
  Pager,
  StatusBadge,
} from "../../../../../../components/admin-ui.tsx";
import { safeSearch } from "../../../../../../admin/validation.ts";
export default async function SupplierProducts({
  params,
  searchParams,
}: {
  params: Promise<{ supplierId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff("suppliers:read");
  const { supplierId } = await params;
  const sp = await searchParams;
  const q = safeSearch.parse(typeof sp.q === "string" ? sp.q : "");
  const active = z.enum(["active", "inactive"]).optional().catch(undefined).parse(sp.active);
  const publishing = z.enum(["published", "not-published"]).optional().catch(undefined).parse(sp.publishing);
  const brand = safeSearch.parse(typeof sp.brand === "string" ? sp.brand : "");
  const category = safeSearch.parse(typeof sp.category === "string" ? sp.category : "");
  const sort = z.enum(["title", "style", "synced", "active"]).catch("title").parse(sp.sort);
  const page = Math.max(1, z.coerce.number().int().catch(1).parse(sp.page));
  const supplier = await database.supplier.findUnique({
    where: { id: supplierId },
    select: { name: true },
  });
  if (!supplier) notFound();
  const [brands, categories] = await Promise.all([
    database.supplierProduct.findMany({ where: { supplierId }, distinct: ["supplierBrand"], orderBy: { supplierBrand: "asc" }, select: { supplierBrand: true } }),
    database.supplierProduct.findMany({ where: { supplierId }, distinct: ["supplierCategory"], orderBy: { supplierCategory: "asc" }, select: { supplierCategory: true } }),
  ]);
  const take = 25;
  const rows = await database.supplierProduct.findMany({
    where: {
      supplierId,
      ...(active ? { active: active === "active" } : {}),
      ...(brand ? { supplierBrand: brand } : {}),
      ...(category ? { supplierCategory: category } : {}),
      ...(publishing === "published" ? { catalogueLinks: { some: {} } } : publishing === "not-published" ? { catalogueLinks: { none: {} } } : {}),
      ...(q
        ? {
            OR: [
              { supplierTitle: { contains: q, mode: "insensitive" } },
              { style: { contains: q, mode: "insensitive" } },
              { supplierBrand: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: take + 1,
    skip: (page - 1) * take,
    orderBy: sort === "style" ? { style: "asc" } : sort === "synced" ? { lastSyncedAt: "desc" } : sort === "active" ? [{ active: "desc" }, { supplierTitle: "asc" }] : { supplierTitle: "asc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { variants: true, colours: true } },
      catalogueLinks: {
        include: { product: { select: { name: true, status: true } } },
      },
    },
  });
  const hasNext = rows.length > take;
  rows.splice(take);
  return (
    <>
      <AdminHeading
        title={`${supplier.name} products`}
        description="Supplier source catalogue, kept separate from CXA customer-facing products."
      />
      <form className="admin-filters">
        <input name="q" defaultValue={q} placeholder="Title, style or brand" />
        <select name="active" defaultValue={active ?? ""}><option value="">All activity</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select name="publishing" defaultValue={publishing ?? ""}><option value="">All CXA links</option><option value="published">Linked</option><option value="not-published">Not published</option></select>
        <select name="brand" defaultValue={brand}><option value="">All supplier brands</option>{brands.map((x)=><option key={x.supplierBrand}>{x.supplierBrand}</option>)}</select>
        <select name="category" defaultValue={category}><option value="">All supplier categories</option>{categories.map((x)=><option key={x.supplierCategory}>{x.supplierCategory}</option>)}</select>
        <select name="sort" defaultValue={sort}><option value="title">Title</option><option value="style">Style</option><option value="synced">Last synced</option><option value="active">Active first</option></select>
        <button>Apply</button>
      </form>
      <div className="admin-product-browser">
        {rows.map((x) => (
          <article className="admin-product-card" key={x.id}>
            {x.images[0] && (
              <Image src={x.images[0].url} alt="" width={120} height={150} />
            )}
            <div>
              <p className="admin-kicker">{x.supplierBrand}</p>
              <h2>
                <Link href={`/admin/suppliers/${supplierId}/products/${x.id}`}>
                  {x.supplierTitle}
                </Link>
              </h2>
              <p>
                {x.style ?? x.supplierProductKey} · {x.supplierCategory}
              </p>
              <p>
                {x._count.colours} colours · {x._count.variants} variants
              </p>
              <StatusBadge value={x.active ? "ACTIVE" : "INACTIVE"} />{" "}<StatusBadge
                value={
                  !x.catalogueLinks.length
                    ? "NOT_PUBLISHED"
                    : x.catalogueLinks.some(
                          (l) => l.product.status === "PUBLISHED",
                        )
                      ? "PUBLISHED"
                      : "LINKED"
                }
              />
            </div>
          </article>
        ))}
      </div>
      <Pager
        page={page}
        hasNext={hasNext}
        base={`/admin/suppliers/${supplierId}/products?q=${encodeURIComponent(q)}&active=${active ?? ""}&publishing=${publishing ?? ""}&brand=${encodeURIComponent(brand)}&category=${encodeURIComponent(category)}&sort=${sort}`}
      />
    </>
  );
}
