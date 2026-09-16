import "server-only";
import { compare } from "bcryptjs";
import { z } from "zod";
import { database } from "../lib/database.ts";
import { audit } from "./audit.ts";
import { clearRateLimit, consumeRateLimit } from "../security/rate-limit.ts";

const credentialsSchema = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export async function authorizeStaffCredentials(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  const key = parsed.success ? parsed.data.email : "invalid";
  if (!parsed.success || !(await consumeRateLimit("LOGIN", key)).allowed) return null;
  const staff = await database.staffUser.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      passwordHash: true,
    },
  });
  const valid = Boolean(
    staff?.active &&
      staff.passwordHash &&
      (await compare(parsed.data.password, staff.passwordHash)),
  );
  if (!valid || !staff) {
    return null;
  }
  await clearRateLimit("LOGIN", key);
  await database.staffUser.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date() },
  });
  await audit(
    staff.id,
    "LOGIN",
    "StaffUser",
    staff.id,
    "Staff login succeeded",
  );
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
  };
}
