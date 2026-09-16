import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";
loadLocalEnvironment(); assertSafeDevelopmentDatabase();
const { cleanupExpiredRateLimits } = await import("../src/security/rate-limit.ts");
const { database } = await import("../src/lib/database.ts");
console.log(JSON.stringify({ removed: (await cleanupExpiredRateLimits()).count }));
await database.$disconnect();
