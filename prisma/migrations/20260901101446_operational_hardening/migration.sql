-- CreateEnum
CREATE TYPE "RateLimitScope" AS ENUM ('LOGIN', 'QUOTE_SUBMISSION', 'ARTWORK_UPLOAD', 'PROOF_ACCESS', 'PROOF_ACTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CUSTOMER_ACKNOWLEDGEMENT', 'STAFF_QUOTE_NOTIFICATION', 'ARTWORK_REVISION', 'PROOF_READY', 'IN_PRODUCTION', 'READY');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAuditAction" ADD VALUE 'PROOF_TOKEN_REVOKED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PROOF_TOKEN_REGENERATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'NOTIFICATION_SENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_ASSIGNMENT_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_PRIORITY_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_DUE_DATE_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_TASK_STATUS_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_STATUS_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PURCHASE_DRAFT_READY';

-- AlterTable
ALTER TABLE "ProofApprovalToken" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupplierPurchaseDraft" ADD COLUMN     "staleStockConfirmationNote" TEXT,
ADD COLUMN     "staleStockConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "staleStockConfirmedById" TEXT;

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scope" "RateLimitScope" NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "sendCustomerAcknowledgement" BOOLEAN NOT NULL DEFAULT true,
    "sendStaffQuoteNotification" BOOLEAN NOT NULL DEFAULT true,
    "sendProofReady" BOOLEAN NOT NULL DEFAULT true,
    "sendArtworkRevision" BOOLEAN NOT NULL DEFAULT true,
    "sendInProduction" BOOLEAN NOT NULL DEFAULT false,
    "sendReady" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "proofId" TEXT,
    "type" "NotificationType" NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "safeErrorSummary" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJobEvent" (
    "id" TEXT NOT NULL,
    "productionJobId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_scope_windowStart_key" ON "RateLimitBucket"("keyHash", "scope", "windowStart");

-- CreateIndex
CREATE INDEX "NotificationDelivery_quoteId_attemptedAt_idx" ON "NotificationDelivery"("quoteId", "attemptedAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_type_status_idx" ON "NotificationDelivery"("type", "status");

-- CreateIndex
CREATE INDEX "ProductionJobEvent_productionJobId_createdAt_idx" ON "ProductionJobEvent"("productionJobId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraft" ADD CONSTRAINT "SupplierPurchaseDraft_staleStockConfirmedById_fkey" FOREIGN KEY ("staleStockConfirmedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "ArtworkProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobEvent" ADD CONSTRAINT "ProductionJobEvent_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobEvent" ADD CONSTRAINT "ProductionJobEvent_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
