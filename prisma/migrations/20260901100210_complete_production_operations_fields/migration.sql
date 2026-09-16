/*
  Warnings:

  - Added the required column `updatedAt` to the `ProductionDecorationTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'SUPPLIER_REQUIREMENT_WAIVED';

-- AlterTable
ALTER TABLE "ProductionDecorationTask" ADD COLUMN     "assignedToStaffUserId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "ProductionDecorationTask" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "ProductionDecorationTask" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductionJob" ADD COLUMN     "assignedToStaffUserId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProductionJobItem" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "SupplierRequirement" ADD COLUMN     "supplierProductId" TEXT;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_assignedToStaffUserId_fkey" FOREIGN KEY ("assignedToStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDecorationTask" ADD CONSTRAINT "ProductionDecorationTask_assignedToStaffUserId_fkey" FOREIGN KEY ("assignedToStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRequirement" ADD CONSTRAINT "SupplierRequirement_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
