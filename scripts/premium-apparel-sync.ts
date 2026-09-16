import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";
loadLocalEnvironment(); const target = process.argv[2]; assertSafeDevelopmentDatabase();
if (!process.env.PREMIUM_APPAREL_API_KEY) throw new Error("PREMIUM_APPAREL_API_KEY is not configured.");
const type = target === "full" ? "FULL" : target === "products" ? "PRODUCTS_INCREMENTAL" : target === "stock-prices" ? "STOCK_PRICES_INCREMENTAL" : null;
if (!type) throw new Error("Expected sync type: full, products, or stock-prices.");
const { queuePremiumApparelSync, claimNextSyncRun, executeSyncRun } = await import("../src/suppliers/premium-apparel/jobs.ts"); const { database } = await import("../src/lib/database.ts");
const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" }, select: { name: true } }); if (supplier.name !== "Premium Apparel") throw new Error("Expected Premium Apparel supplier.");
const queued = await queuePremiumApparelSync(type, "DEVELOPMENT"); const claimed = await claimNextSyncRun(); if (!claimed || claimed.id !== queued.id) throw new Error("Unable to claim the queued development sync.");
try {
  try {
    await executeSyncRun(claimed.id);
  } catch {
    process.exitCode = 1;
  }

  const result = await database.supplierSyncRun.findUniqueOrThrow({
    where: { id: claimed.id },
    select: { id: true, syncType: true, status: true, startedAt: true, completedAt: true, productCount: true, productAddedCount: true, productUpdatedCount: true, colourCount: true, variantCount: true, imageCount: true, stockUpdatedCount: true, priceUpdatedCount: true, skippedCount: true, removedProductCount: true, removedVariantCount: true, errorSummary: true },
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await database.$disconnect();
}
