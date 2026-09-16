-- CreateEnum
CREATE TYPE "SupplierSyncType" AS ENUM ('FULL', 'PRODUCTS_INCREMENTAL', 'STOCK_PRICES_INCREMENTAL');

-- CreateEnum
CREATE TYPE "SupplierSyncRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierSyncTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "SupplierSyncPhase" AS ENUM ('QUEUED', 'FETCHING_PRODUCTS', 'PROCESSING_PRODUCTS', 'FETCHING_STOCK', 'PROCESSING_STOCK', 'FETCHING_PRICES', 'PROCESSING_PRICES', 'FINALIZING', 'COMPLETE');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'SUPPLIER_SYNC_QUEUED';

-- CreateTable
CREATE TABLE "SupplierSyncRun" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "syncType" "SupplierSyncType" NOT NULL,
    "status" "SupplierSyncRunStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" "SupplierSyncTriggerType" NOT NULL,
    "triggeredByStaffUserId" TEXT,
    "phase" "SupplierSyncPhase" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "productAddedCount" INTEGER NOT NULL DEFAULT 0,
    "productUpdatedCount" INTEGER NOT NULL DEFAULT 0,
    "colourCount" INTEGER NOT NULL DEFAULT 0,
    "variantCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "stockUpdatedCount" INTEGER NOT NULL DEFAULT 0,
    "priceUpdatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "removedProductCount" INTEGER NOT NULL DEFAULT 0,
    "removedVariantCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSyncLock" (
    "supplierId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSyncLock_pkey" PRIMARY KEY ("supplierId")
);

-- CreateIndex
CREATE INDEX "SupplierSyncRun_supplierId_queuedAt_idx" ON "SupplierSyncRun"("supplierId", "queuedAt");

-- CreateIndex
CREATE INDEX "SupplierSyncRun_status_queuedAt_idx" ON "SupplierSyncRun"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "SupplierSyncRun_triggeredByStaffUserId_idx" ON "SupplierSyncRun"("triggeredByStaffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierSyncLock_syncRunId_key" ON "SupplierSyncLock"("syncRunId");

-- CreateIndex
CREATE INDEX "SupplierSyncLock_expiresAt_idx" ON "SupplierSyncLock"("expiresAt");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_active_idx" ON "SupplierProduct"("supplierId", "active");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_supplierBrand_idx" ON "SupplierProduct"("supplierId", "supplierBrand");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_supplierCategory_idx" ON "SupplierProduct"("supplierId", "supplierCategory");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_lastSyncedAt_idx" ON "SupplierProduct"("supplierId", "lastSyncedAt");

-- CreateIndex
CREATE INDEX "SupplierVariant_supplierId_active_idx" ON "SupplierVariant"("supplierId", "active");

-- CreateIndex
CREATE INDEX "SupplierVariant_stockUpdatedAt_idx" ON "SupplierVariant"("stockUpdatedAt");

-- CreateIndex
CREATE INDEX "SupplierVariant_priceUpdatedAt_idx" ON "SupplierVariant"("priceUpdatedAt");

-- AddForeignKey
ALTER TABLE "SupplierSyncRun" ADD CONSTRAINT "SupplierSyncRun_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSyncRun" ADD CONSTRAINT "SupplierSyncRun_triggeredByStaffUserId_fkey" FOREIGN KEY ("triggeredByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSyncLock" ADD CONSTRAINT "SupplierSyncLock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSyncLock" ADD CONSTRAINT "SupplierSyncLock_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SupplierSyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
