import "server-only";
import { redirect } from "next/navigation";
import { auth } from "../auth.ts";
import { database } from "../lib/database.ts";
import type { AdminCapability, StaffRoleName } from "./permissions.ts";
import { assertCapability } from "./permissions.ts";

export async function requireStaff(capability: AdminCapability = "admin:read") {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  const staff = await database.staffUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!staff?.active) redirect("/admin/login");
  assertCapability(staff.role as StaffRoleName, capability);
  return staff;
}
