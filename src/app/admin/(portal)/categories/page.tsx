import { database } from "../../../../lib/database.ts";
import { requireStaff } from "../../../../admin/session.ts";
import { can } from "../../../../admin/permissions.ts";
import { saveCategory } from "../../../../admin/actions.ts";
import { AdminHeading, StatusBadge } from "../../../../components/admin-ui.tsx";
export default async function CategoriesAdmin() {
  const staff = await requireStaff("catalogue:read");
  const rows = await database.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      parent: true,
      _count: { select: { products: true, children: true } },
    },
  });
  const writable = can(staff.role, "catalogue:write");
  const fields = (x?: (typeof rows)[number]) => (
    <>
      <label>
        Name
        <input
          name="name"
          defaultValue={x?.name}
          required
          disabled={!writable}
        />
      </label>
      <label>
        Slug
        <input
          name="slug"
          defaultValue={x?.slug}
          required
          disabled={!writable}
        />
      </label>
      <label>
        Introduction
        <textarea
          name="description"
          defaultValue={x?.description ?? ""}
          disabled={!writable}
        />
      </label>
      <label>
        Parent
        <select
          name="parentId"
          defaultValue={x?.parentId ?? ""}
          disabled={!writable}
        >
          <option value="">Top level</option>
          {rows
            .filter((c) => c.id !== x?.id)
            .map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      <label className="admin-check">
        <input
          name="active"
          type="checkbox"
          defaultChecked={x?.active ?? true}
          disabled={!writable}
        />
        Active
      </label>
    </>
  );
  return (
    <>
      <AdminHeading
        title="Categories"
        description="Manage the CXA hierarchy and landing-page introductions."
      />
      {writable && (
        <form action={saveCategory} className="admin-card admin-form">
          <h2>Create category</h2>
          {fields()}
          <button className="admin-primary">Create category</button>
        </form>
      )}
      <div className="admin-stack">
        {rows.map((x) => (
          <form
            action={saveCategory}
            className="admin-card admin-form"
            key={x.id}
          >
            <input type="hidden" name="id" value={x.id} />
            <div className="admin-card-title">
              <h2>
                {x.parent ? `${x.parent.name} / ` : ""}
                {x.name}
              </h2>
              <StatusBadge value={x.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <p>
              {x._count.products} products · {x._count.children} child
              categories
            </p>
            {fields(x)}
            {writable && <button>Save category</button>}
          </form>
        ))}
      </div>
    </>
  );
}
