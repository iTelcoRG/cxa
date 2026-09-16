import "server-only";
import { Prisma } from "../../generated/prisma/client.ts";
import type { SupplierSyncTriggerType, SupplierSyncType } from "../../generated/prisma/client.ts";
import { database } from "../../lib/database.ts";
import { PremiumApparelError } from "./errors.ts";
import { SupplierProductMappingError, SupplierProductPersistenceError, syncPricesIncremental, syncProductsFull, syncProductsIncremental, syncStockIncremental } from "./sync.ts";

const BASELINE_CURSOR = "1970-01-01T00:00:00.000Z";
const LOCK_MINUTES = Number(process.env.PREMIUM_APPAREL_SYNC_LOCK_MINUTES ?? 60);

export class SyncAlreadyRunningError extends Error { constructor() { super("Sync already running."); this.name = "SyncAlreadyRunningError"; } }

export async function queuePremiumApparelSync(syncType: SupplierSyncType, triggerType: SupplierSyncTriggerType, staffUserId?: string) {
  const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" }, select: { id: true } });
  try {
    return await database.$transaction(async (tx) => {
      const active = await tx.supplierSyncRun.findFirst({ where: { supplierId: supplier.id, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
      if (active) throw new SyncAlreadyRunningError();
      return tx.supplierSyncRun.create({ data: { supplierId: supplier.id, syncType, triggerType, triggeredByStaffUserId: staffUserId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (cause) { if (cause instanceof SyncAlreadyRunningError) throw cause; if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2034") throw new SyncAlreadyRunningError(); throw cause; }
}

export async function claimNextSyncRun() {
  try { return await database.$transaction(async (tx) => {
    const queued = await tx.supplierSyncRun.findFirst({ where: { status: "QUEUED" }, orderBy: { queuedAt: "asc" }, select: { id: true } });
    if (!queued) return null;
    const claimed = await tx.supplierSyncRun.updateMany({ where: { id: queued.id, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date(), attemptCount: { increment: 1 }, errorSummary: null } });
    return claimed.count === 1 ? tx.supplierSyncRun.findUnique({ where: { id: queued.id } }) : null;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (cause) { if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2034") return null; throw cause; }
}

export async function acquireSupplierSyncLock(runId: string): Promise<boolean> {
  const run = await database.supplierSyncRun.findUniqueOrThrow({ where: { id: runId }, select: { supplierId: true } }); const now = new Date();
  try { await database.$transaction(async (tx) => { await tx.supplierSyncLock.deleteMany({ where: { supplierId: run.supplierId, expiresAt: { lt: now } } }); await tx.supplierSyncLock.create({ data: { supplierId: run.supplierId, syncRunId: runId, expiresAt: new Date(now.getTime() + Math.max(5, LOCK_MINUTES) * 60_000) } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); return true; } catch (cause) { if (cause instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(cause.code)) return false; throw cause; }
}

export async function releaseSupplierSyncLock(runId: string): Promise<void> { await database.supplierSyncLock.deleteMany({ where: { syncRunId: runId } }); }

export async function executeSyncRun(runId: string): Promise<void> {
  const run = await database.supplierSyncRun.findUniqueOrThrow({ where: { id: runId }, include: { supplier: true } });
  if (run.status !== "RUNNING") throw new Error("Only a claimed sync run can execute.");
  if (!(await acquireSupplierSyncLock(runId))) { await database.supplierSyncRun.update({ where: { id: runId }, data: { status: "QUEUED", startedAt: null, errorSummary: "Sync already running." } }); throw new SyncAlreadyRunningError(); }
  const started = Date.now(); safeSyncLog({ syncRunId: runId, supplierId: run.supplierId, syncType: run.syncType, phase: "RUNNING" });
  try {
    let skipped = 0; let removedVariants = 0;
    if (run.syncType === "FULL") {
      await setPhase(runId, "FETCHING_PRODUCTS");
      const products = await syncProductsFull(async (p) => { await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_PRODUCTS", productCount: p.products, colourCount: p.colours, variantCount: p.variants, imageCount: p.images } }); safeSyncLog({ syncRunId: runId, supplierId: run.supplierId, syncType: run.syncType, phase: "PROCESSING_PRODUCTS", batchNumber: p.batchNumber, recordsProcessed: p.products }); });
      await database.supplierSyncRun.update({ where: { id: runId }, data: { productCount: products.processed, productAddedCount: products.added, productUpdatedCount: products.updated, colourCount: products.colours, variantCount: products.variants, imageCount: products.images, removedProductCount: products.removed } });
      await setPhase(runId, "FETCHING_STOCK"); const stock = await syncStockIncremental(BASELINE_CURSOR); skipped += stock.skipped; removedVariants += stock.removed; await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_STOCK", stockUpdatedCount: stock.processed } });
      await setPhase(runId, "FETCHING_PRICES"); const prices = await syncPricesIncremental(BASELINE_CURSOR); skipped += prices.skipped; removedVariants += prices.removed; await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_PRICES", priceUpdatedCount: prices.processed } });
    } else if (run.syncType === "PRODUCTS_INCREMENTAL") {
      const cursor = await cursorFor(run.supplierId, "PRODUCTS"); await setPhase(runId, "FETCHING_PRODUCTS"); const result = await syncProductsIncremental(cursor); skipped = result.skipped; await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_PRODUCTS", productCount: result.processed, removedProductCount: result.removed } });
    } else {
      const [stockCursor, priceCursor] = await Promise.all([cursorFor(run.supplierId, "STOCK"), cursorFor(run.supplierId, "PRICES")]); await setPhase(runId, "FETCHING_STOCK"); const stock = await syncStockIncremental(stockCursor); await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_STOCK", stockUpdatedCount: stock.processed } }); await setPhase(runId, "FETCHING_PRICES"); const prices = await syncPricesIncremental(priceCursor); skipped = stock.skipped + prices.skipped; removedVariants = stock.removed + prices.removed; await database.supplierSyncRun.update({ where: { id: runId }, data: { phase: "PROCESSING_PRICES", priceUpdatedCount: prices.processed } });
    }
    await setPhase(runId, "FINALIZING"); await database.supplierSyncRun.update({ where: { id: runId }, data: { status: skipped ? "PARTIAL" : "SUCCEEDED", phase: "COMPLETE", skippedCount: skipped, removedVariantCount: removedVariants, completedAt: new Date() } });
    safeSyncLog({ syncRunId: runId, supplierId: run.supplierId, syncType: run.syncType, phase: "COMPLETE", duration: Date.now() - started });
  } catch (cause) {
    const summary = safeFailureSummary(cause); await database.supplierSyncRun.update({ where: { id: runId }, data: { status: "FAILED", completedAt: new Date(), errorSummary: summary } }); safeSyncLog({ syncRunId: runId, supplierId: run.supplierId, syncType: run.syncType, phase: "FAILED", duration: Date.now() - started }); throw cause;
  } finally { await releaseSupplierSyncLock(runId); }
}

async function cursorFor(supplierId: string, resource: "PRODUCTS" | "STOCK" | "PRICES"): Promise<string> { return (await database.supplierSyncState.findUnique({ where: { supplierId_resource: { supplierId, resource } }, select: { lastSuccessfulCursor: true } }))?.lastSuccessfulCursor ?? BASELINE_CURSOR; }
async function setPhase(id: string, phase: "FETCHING_PRODUCTS" | "FETCHING_STOCK" | "FETCHING_PRICES" | "FINALIZING") { await database.supplierSyncRun.update({ where: { id }, data: { phase } }); }
export function safeFailureSummary(cause: unknown): string { if (cause instanceof PremiumApparelError) { if (cause.status === 503) return "Premium Apparel sync failed due to upstream service unavailability."; if (cause.code === "timeout") return "Premium Apparel sync failed because the upstream request timed out."; if (cause.status === 401 || cause.status === 403) return "Premium Apparel sync failed due to supplier authentication or access configuration."; if (cause.code === "invalid_response") return cause.message === "Premium Apparel product response exceeded its configured size limit." ? "Premium Apparel product response exceeded the configured safe size limit." : "Premium Apparel returned an invalid or incomplete product response."; } if (cause instanceof SupplierProductMappingError) return "Premium Apparel sync encountered an undocumented product field shape."; if (cause instanceof SupplierProductPersistenceError) return cause.validationField ? `Premium Apparel sync found an invalid ${cause.validationField} field while persisting a product batch.` : cause.databaseCode ? `Premium Apparel sync could not persist a mapped product batch (${cause.databaseCode}).` : cause.databaseErrorName ? `Premium Apparel sync could not persist a mapped product batch (${cause.databaseErrorName}).` : "Premium Apparel sync could not persist a mapped product batch."; if (cause instanceof Prisma.PrismaClientKnownRequestError) return `Premium Apparel sync database operation failed (${cause.code}).`; if (cause instanceof Error && cause.name.startsWith("Prisma")) return `Premium Apparel sync database validation failed (${cause.name}).`; if (cause instanceof SyntaxError) return "Premium Apparel product streaming encountered invalid JSON."; return "Premium Apparel sync failed unexpectedly. Review sanitized server logs."; }
function safeSyncLog(fields: Record<string, string | number>) { console.info(JSON.stringify({ event: "supplier_sync", ...fields })); }
