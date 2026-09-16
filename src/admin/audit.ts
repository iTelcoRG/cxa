import "server-only";
import type { AdminAuditAction } from "../generated/prisma/client.ts";
import { database } from "../lib/database.ts";

export async function audit(
  staffUserId: string,
  action: AdminAuditAction,
  entityType: string,
  entityId: string,
  summary: string,
): Promise<void> {
  await database.adminAuditLog.create({
    data: {
      staffUserId,
      action,
      entityType: entityType.slice(0, 80),
      entityId: entityId.slice(0, 80),
      summary: summary.replace(/[\r\n<>]/g, " ").slice(0, 300),
    },
  });
}
