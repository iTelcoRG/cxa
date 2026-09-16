import type { Metadata } from "next";
import { requireStaff } from "../../../admin/session.ts";
import { AdminShell } from "../../../components/admin-shell.tsx";
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | CXA Admin" },
  robots: { index: false, follow: false },
};
export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
