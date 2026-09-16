import { hash } from "bcryptjs";
import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();

const email = process.env.CXA_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.CXA_ADMIN_PASSWORD;
if (!email || !email.includes("@")) throw new Error("CXA_ADMIN_EMAIL must be configured with a valid email.");
if (!password || password.length < 12) throw new Error("CXA_ADMIN_PASSWORD must contain at least 12 characters.");

const { database } = await import("../src/lib/database.ts");
const passwordHash = await hash(password, 12);
const staff = await database.staffUser.upsert({
  where: { email },
  create: { email, name: "CXA Administrator", passwordHash, role: "ADMIN", active: true },
  update: { passwordHash, role: "ADMIN", active: true },
  select: { id: true, email: true, name: true, role: true, active: true },
});
console.log(JSON.stringify({ createdOrUpdated: true, staff }, null, 2));
await database.$disconnect();

