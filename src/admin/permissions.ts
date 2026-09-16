export type StaffRoleName =
  | "ADMIN"
  | "CATALOGUE_MANAGER"
  | "QUOTE_MANAGER"
  | "READ_ONLY";

export type AdminCapability =
  | "admin:read"
  | "quotes:read"
  | "quotes:write"
  | "catalogue:read"
  | "catalogue:write"
  | "suppliers:read"
  | "suppliers:write"
  | "settings:read";

const permissions: Record<StaffRoleName, ReadonlySet<AdminCapability>> = {
  ADMIN: new Set([
    "admin:read",
    "quotes:read",
    "quotes:write",
    "catalogue:read",
    "catalogue:write",
    "suppliers:read",
    "suppliers:write",
    "settings:read",
  ]),
  CATALOGUE_MANAGER: new Set([
    "admin:read",
    "quotes:read",
    "catalogue:read",
    "catalogue:write",
    "suppliers:read",
    "suppliers:write",
    "settings:read",
  ]),
  QUOTE_MANAGER: new Set([
    "admin:read",
    "quotes:read",
    "quotes:write",
    "catalogue:read",
    "settings:read",
  ]),
  READ_ONLY: new Set([
    "admin:read",
    "quotes:read",
    "catalogue:read",
    "suppliers:read",
    "settings:read",
  ]),
};

export function can(role: StaffRoleName, capability: AdminCapability): boolean {
  return permissions[role].has(capability);
}

export function assertCapability(
  role: StaffRoleName,
  capability: AdminCapability,
): void {
  if (!can(role, capability))
    throw new Error("Not authorized for this admin action.");
}
