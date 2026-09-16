import { loadLocalEnvironment } from "./development-database.ts";
loadLocalEnvironment();
const { claimNextSyncRun, executeSyncRun, SyncAlreadyRunningError } = await import("../src/suppliers/premium-apparel/jobs.ts");
const once = process.argv.includes("--once"); const spacing = Math.max(500, Number(process.env.SUPPLIER_SYNC_WORKER_POLL_MS ?? 5_000));
for (;;) { const run = await claimNextSyncRun(); if (run) { try { await executeSyncRun(run.id); } catch (cause) { if (!(cause instanceof SyncAlreadyRunningError)) process.exitCode = 1; } } if (once) break; await new Promise((resolve) => setTimeout(resolve, spacing)); }

