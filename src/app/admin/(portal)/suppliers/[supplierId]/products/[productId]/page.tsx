import Image from "next/image";
import { notFound } from "next/navigation";
import { database } from "../../../../../../../lib/database.ts";
import { requireStaff } from "../../../../../../../admin/session.ts";
import { can } from "../../../../../../../admin/permissions.ts";
import {
  linkSupplierProduct,
  publishSupplierProduct,
} from "../../../../../../../admin/actions.ts";
import { supplierContentToPlainText } from "../../../../../../../catalogue/sanitize.ts";
import {
  AdminHeading,
  StatusBadge,
} from "../../../../../../../components/admin-ui.tsx";
export default async function SupplierProductDetail({
  params,
}: {
  params: Promise<{ supplierId: string; productId: string }>;
}) {
  const staff = await requireStaff("suppliers:read");
  const { supplierId, productId } = await params;
  const [item, brands, categories, products] = await Promise.all([
    database.supplierProduct.findFirst({
      where: { id: productId, supplierId },
      include: {
        supplier: true,
        images: { orderBy: { sortOrder: "asc" } },
        colours: { include: { variants: { orderBy: { size: "asc" } } } },
        catalogueLinks: { include: { product: true } },
      },
    }),
    database.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    database.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    database.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
  ]);
  if (!item) notFound();
  const writable = can(staff.role, "catalogue:write");
  return (
    <>
      <AdminHeading
        title={item.supplierTitle}
        description={`${item.supplier.name} · ${item.style ?? item.supplierProductKey}`}
      />
      <div className="admin-two-column">
        <section className="admin-card">
          <h2>Supplier source</h2>
          <p>
            <strong>Brand:</strong> {item.supplierBrand}
          </p>
          <p>
            <strong>Category:</strong> {item.supplierCategory}
          </p>
          <p>
            <strong>Fabric:</strong> {item.fabric ?? "Not supplied"}
          </p>
          <p>
            <strong>Features:</strong> {item.features ?? "Not supplied"}
          </p>
          <p className="admin-prewrap">
            {supplierContentToPlainText(
              item.textDescription ?? item.htmlDescription,
            ) ?? "No description supplied."}
          </p>
          <div className="admin-image-strip">
            {item.images.slice(0, 8).map((x) => (
              <Image key={x.id} src={x.url} alt="" width={100} height={125} />
            ))}
          </div>
        </section>
        <section className="admin-card">
          <h2>CXA publishing</h2>
          {item.catalogueLinks.length ? (
            item.catalogueLinks.map((x) => (
              <p key={x.id}>
                <StatusBadge value={x.product.status} /> {x.product.name}
                {x.preferredSupplier ? " · Preferred supplier" : ""}
              </p>
            ))
          ) : (
            <p>Not published or linked.</p>
          )}
          {writable && !item.catalogueLinks.length && (
            <form
              action={publishSupplierProduct.bind(null, item.id)}
              className="admin-form"
            >
              <h3>Publish to CXA</h3>
              <label>
                CXA product name
                <input name="name" defaultValue={item.supplierTitle} required />
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  required
                  placeholder="customer-facing-slug"
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={
                    supplierContentToPlainText(
                      item.textDescription ?? item.htmlDescription,
                    ) ?? ""
                  }
                />
              </label>
              <label>
                Brand
                <select name="brandId" required>
                  {brands.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select name="categoryId" required>
                  {categories.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status">
                  <option>DRAFT</option>
                  <option>PUBLISHED</option>
                </select>
              </label>
              {[
                ["screenPrint", "Screen print"],
                ["embroidery", "Embroidery"],
                ["dtf", "DTF"],
                ["featured", "Featured"],
                ["newProduct", "New product"],
              ].map(([n, l]) => (
                <label className="admin-check" key={n}>
                  <input type="checkbox" name={n} />
                  {l}
                </label>
              ))}
              <button className="admin-primary">Publish to CXA</button>
            </form>
          )}
          {writable && (
            <form
              action={linkSupplierProduct.bind(null, item.id)}
              className="admin-form"
            >
              <h3>Link to existing CXA product</h3>
              <select name="productId" required>
                {products.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name} ({x.status})
                  </option>
                ))}
              </select>
              <button>Link product</button>
            </form>
          )}
        </section>
      </div>
      <section className="admin-section">
        <h2>Colours, sizes and operational stock</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Colour</th>
                <th>Size</th>
                <th>Stock</th>
                <th>Active</th>
                {can(staff.role, "catalogue:write") && (
                  <th>Internal supplier price</th>
                )}
              </tr>
            </thead>
            <tbody>
              {item.colours.flatMap((c) =>
                c.variants.map((v) => (
                  <tr key={v.id}>
                    <td>{c.colourDescription}</td>
                    <td>{v.size}</td>
                    <td>{v.stock}</td>
                    <td>{v.active ? "Yes" : "No"}</td>
                    {can(staff.role, "catalogue:write") && (
                      <td>
                        <span className="admin-confidential">CONFIDENTIAL</span>{" "}
                        {v.supplierPrice === null ? "Pending" : `$${v.supplierPrice.toString()}`}
                      </td>
                    )}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
