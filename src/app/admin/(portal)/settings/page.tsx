import { database } from "../../../../lib/database.ts";
import { requireStaff } from "../../../../admin/session.ts";
import { AdminHeading, StatusBadge } from "../../../../components/admin-ui.tsx";
import { settings as notificationSettings } from "../../../../notifications/policy.ts";
import { updateNotificationSettingsAction } from "../../../../admin/hardening-actions.ts";
export default async function Settings() {
  await requireStaff("settings:read");
  const staff = await database.staffUser.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
    },
  });
  const notifications = await notificationSettings();
  return (
    <>
      <AdminHeading
        title="Settings"
        description="Staff access overview. User management remains command-controlled in this milestone."
      />
      <section className="admin-card">
        <h2>Notification policy</h2>
        <form action={updateNotificationSettingsAction} className="admin-stack">
          {[["sendCustomerAcknowledgement", "Customer acknowledgement"], ["sendStaffQuoteNotification", "Staff quote notification"], ["sendProofReady", "Proof-ready email"], ["sendArtworkRevision", "Artwork revision email"], ["sendInProduction", "In-production email"], ["sendReady", "Ready for pickup/delivery email"]].map(([name, label]) => <label key={name}><input type="checkbox" name={name} defaultChecked={Boolean(notifications[name as keyof typeof notifications])}/> {label}</label>)}
          <button>Save notification policy</button>
        </form>
      </section>
      <section className="admin-card">
        <h2>Staff users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td>{x.email}</td>
                  <td>{x.role.replaceAll("_", " ")}</td>
                  <td>
                    <StatusBadge value={x.active ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td>{x.lastLoginAt?.toLocaleString("en-NZ") ?? "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-card">
        <h2>Operations</h2>
        <p>
          Supplier synchronization is status-only in Task 10. Scheduled and
          manually triggered sync controls are reserved for Task 11.
        </p>
        <p>Supplier ordering is not available.</p>
      </section>
    </>
  );
}
