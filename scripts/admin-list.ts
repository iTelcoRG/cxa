import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();
const { database } = await import("../src/lib/database.ts");
const staff = await database.staffUser.findMany({ orderBy: { email: "asc" }, select: { name: true, email: true, role: true, active: true, lastLoginAt: true } });
console.log(JSON.stringify(staff, null, 2));
await database.$disconnect();

