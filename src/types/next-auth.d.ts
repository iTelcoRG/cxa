import type { DefaultSession } from "next-auth";
import type { StaffRole } from "../generated/prisma/client.ts";

declare module "next-auth" {
  interface User { role: StaffRole }
  interface Session { user: { id: string; role: StaffRole } & DefaultSession["user"] }
}

declare module "next-auth/jwt" { interface JWT { staffUserId?: string } }

