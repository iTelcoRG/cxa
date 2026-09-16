import { notFound } from "next/navigation";
import { database } from "../../../../../lib/database.ts";
import { requireStaff } from "../../../../../admin/session.ts";
import { can } from "../../../../../admin/permissions.ts";
import {
  setPreferredSupplier,
  updateProduct,
} from "../../../../../admin/actions.ts";
import {
  AdminHeading,
  StatusBadge,
} from "../../../../../components/admin-ui.tsx";
import { supplierContentToPlainText } from "../../../../../catalogue/sanitize.ts";
export default async function ProductEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff("catalogue:read");
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    database.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        supplierLinks: {
          include: { supplierProduct: { include: { supplier: true } } },
        },
      },
    }),
    database.brand.findMany({ orderBy: { name: "asc" } }),
    database.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  const writable = can(staff.role, "catalogue:write");
  return (
    <>
      <AdminHeading
        title={product.name}
        description="Edit CXA-owned customer-facing merchandising fields."
      />
      <div className="admin-two-column admin-editor">
        <section className="admin-card">
          <h2>CXA customer-facing data</h2>
          <form
            action={updateProduct.bind(null, product.id)}
            className="admin-form"
          >
            <label>
              Name
              <input
                name="name"
                defaultValue={product.name}
                required
                disabled={!writable}
              />
            </label>
            <label>
              Slug
              <input
                name="slug"
                defaultValue={product.slug}
                required
                disabled={!writable}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={product.description ?? ""}
                maxLength={5000}
                disabled={!writable}
              />
            </label>
            <label>
              Brand
              <select
                name="brandId"
                defaultValue={product.brandId ?? ""}
                disabled={!writable}
              >
                <option value="">Unassigned</option>
                {brands.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                name="categoryId"
                defaultValue={product.categoryId ?? ""}
                disabled={!writable}
              >
                <option value="">Unassigned</option>
                {categories.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                name="status"
                defaultValue={product.status}
                disabled={!writable}
              >
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>ARCHIVED</option>
              </select>
            </label>
            <label>
              Primary image URL
              <input
                name="primaryImage"
                type="url"
                defaultValue={product.primaryImage ?? ""}
                disabled={!writable}
              />
            </label>
            <fieldset>
              <legend>Merchandising</legend>
              {[
                ["featured", "Featured", product.featured],
                ["newProduct", "New product", product.newProduct],
                ["screenPrint", "Screen print", product.screenPrint],
                ["embroidery", "Embroidery", product.embroidery],
                ["dtf", "DTF", product.dtf],
              ].map(([n, l, v]) => (
                <label className="admin-check" key={String(n)}>
                  <input
                    type="checkbox"
                    name={String(n)}
                    defaultChecked={Boolean(v)}
                    disabled={!writable}
                  />
                  {String(l)}
                </label>
              ))}
            </fieldset>
            {writable && (
              <button className="admin-primary">Save product</button>
            )}
          </form>
        </section>
        <aside className="admin-card">
          <h2>Supplier source information</h2>
          <p className="admin-muted">
            Reference only. Supplier-owned data cannot be edited here.
          </p>
          <StatusBadge value={product.status} />
          {product.supplierLinks.map((link) => (
            <article className="admin-source" key={link.id}>
              <strong>{link.supplierProduct.supplier.name}</strong>
              <p>{link.preferredSupplier ? "Preferred supplier" : "Linked supplier"}</p>
              <p>{link.supplierProduct.supplierTitle}</p>
              <p>
                Style:{" "}
                {link.supplierProduct.style ??
                  link.supplierProduct.supplierProductKey}
              </p>
              {writable && !link.preferredSupplier && (
                <form action={setPreferredSupplier.bind(null, product.id)}>
                  <input type="hidden" name="linkId" value={link.id} />
                  <button>Make preferred supplier</button>
                </form>
              )}
              <p>
                {supplierContentToPlainText(
                  link.supplierProduct.textDescription,
                  link.supplierProduct.htmlDescription,
                ) || "No supplier copy."}
              </p>
            </article>
          ))}
        </aside>
      </div>
    </>
  );
}
