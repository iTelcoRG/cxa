-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'CATALOGUE_MANAGER', 'QUOTE_MANAGER', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('LOGIN', 'QUOTE_STATUS_CHANGED', 'QUOTE_INTERNAL_NOTE_ADDED', 'NOTIFICATION_RESENT', 'PRODUCT_UPDATED', 'PRODUCT_PUBLISHED', 'PRODUCT_UNPUBLISHED', 'SUPPLIER_PRODUCT_PUBLISHED', 'SUPPLIER_PRODUCT_LINKED', 'BRAND_CREATED', 'BRAND_UPDATED', 'CATEGORY_CREATED', 'CATEGORY_UPDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteEventType" ADD VALUE 'STATUS_CHANGED';
ALTER TYPE "QuoteEventType" ADD VALUE 'NOTIFICATION_RESENT';

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "QuoteEvent" ADD COLUMN     "newStatus" "QuoteStatus",
ADD COLUMN     "previousStatus" "QuoteStatus",
ADD COLUMN     "staffUserId" TEXT;

-- CreateTable
CREATE TABLE "QuoteInternalNote" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'READ_ONLY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteInternalNote_quoteId_createdAt_idx" ON "QuoteInternalNote"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteInternalNote_staffUserId_idx" ON "QuoteInternalNote"("staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE INDEX "StaffUser_active_idx" ON "StaffUser"("active");

-- CreateIndex
CREATE INDEX "StaffUser_role_idx" ON "StaffUser"("role");

-- CreateIndex
CREATE INDEX "AdminAuditLog_staffUserId_createdAt_idx" ON "AdminAuditLog"("staffUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInternalNote" ADD CONSTRAINT "QuoteInternalNote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInternalNote" ADD CONSTRAINT "QuoteInternalNote_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
