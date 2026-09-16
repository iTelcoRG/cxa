import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";
loadLocalEnvironment(); assertSafeDevelopmentDatabase();
const dryRun = process.argv.includes("--dry-run");
const { database } = await import("../src/lib/database.ts"); const { cleanupArtwork } = await import("../src/artwork/cleanup.ts");
try { console.log(JSON.stringify(await cleanupArtwork({ dryRun }), null, 2)); } finally { await database.$disconnect(); }
