import { database } from "../../../../lib/database.ts";
import { requireStaff } from "../../../../admin/session.ts";
import { can } from "../../../../admin/permissions.ts";
import { saveBrand } from "../../../../admin/actions.ts";
import { AdminHeading, StatusBadge } from "../../../../components/admin-ui.tsx";
export default async function BrandsAdmin() {
  const staff = await requireStaff("catalogue:read");
  const brands = await database.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const writable = can(staff.role, "catalogue:write");
  return (
    <>
      <AdminHeading
        title="Brands"
        description="Manage CXA brand identities and customer-facing descriptions."
      />
      {writable && (
        <form action={saveBrand} className="admin-card admin-form">
          <h2>Create brand</h2>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Slug
            <input name="slug" required />
          </label>
          <label>
            Description
            <textarea name="description" maxLength={5000} />
          </label>
          <label className="admin-check">
            <input name="active" type="checkbox" defaultChecked />
            Active
          </label>
          <button className="admin-primary">Create brand</button>
        </form>
      )}
      <div className="admin-stack">
        {brands.map((x) => (
          <form action={saveBrand} className="admin-card admin-form" key={x.id}>
            <input type="hidden" name="id" value={x.id} />
            <div className="admin-card-title">
              <h2>{x.name}</h2>
              <StatusBadge value={x.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <p>{x._count.products} products</p>
            <label>
              Name
              <input name="name" defaultValue={x.name} disabled={!writable} />
            </label>
            <label>
              Slug
              <input name="slug" defaultValue={x.slug} disabled={!writable} />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={x.description ?? ""}
                disabled={!writable}
              />
            </label>
            <label className="admin-check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={x.active}
                disabled={!writable}
              />
              Active
            </label>
            {writable && <button>Save brand</button>}
          </form>
        ))}
      </div>
    </>
  );
}
