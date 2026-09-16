-- CreateEnum
CREATE TYPE "QuoteWorkflowStage" AS ENUM ('QUOTE_SUBMITTED', 'ARTWORK_REVIEW', 'PROOF_PREPARATION', 'AWAITING_CUSTOMER_APPROVAL', 'PRODUCTION_PLANNING', 'SUPPLIER_ORDER_PREPARATION', 'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArtworkRevisionStatus" AS ENUM ('OPEN', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArtworkProofStatus" AS ENUM ('DRAFT', 'READY_FOR_CUSTOMER', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ProductionJobStatus" AS ENUM ('PLANNING', 'READY', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProductionItemStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProductionTaskStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "SupplierRequirementStatus" AS ENUM ('REQUIRED', 'READY_TO_ORDER', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseDraftStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED_MANUALLY', 'ORDERED', 'PART_RECEIVED', 'RECEIVED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAuditAction" ADD VALUE 'WORKFLOW_STAGE_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_REVISION_REQUESTED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_REVISION_RESOLVED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_PROOF_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_PROOF_READY';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_PROOF_APPROVED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_PROOF_REJECTED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_JOB_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PRODUCTION_JOB_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'SUPPLIER_REQUIREMENTS_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PURCHASE_DRAFT_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'PURCHASE_DRAFT_UPDATED';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "artworkNoFileConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "artworkNoFileConfirmedById" TEXT,
ADD COLUMN     "artworkNoFileNote" TEXT,
ADD COLUMN     "supplierRequirementWaivedAt" TIMESTAMP(3),
ADD COLUMN     "supplierRequirementWaivedById" TEXT,
ADD COLUMN     "supplierRequirementWaiverReason" TEXT,
ADD COLUMN     "workflowStage" "QuoteWorkflowStage" NOT NULL DEFAULT 'QUOTE_SUBMITTED';

-- CreateTable
CREATE TABLE "QuoteWorkflowEvent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "previousStage" "QuoteWorkflowStage",
    "newStage" "QuoteWorkflowStage" NOT NULL,
    "staffUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkRevisionRequest" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteLineId" TEXT,
    "decorationId" TEXT,
    "status" "ArtworkRevisionStatus" NOT NULL DEFAULT 'OPEN',
    "request" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkRevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkProof" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteLineId" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "sourceArtworkFileId" TEXT,
    "version" INTEGER NOT NULL,
    "status" "ArtworkProofStatus" NOT NULL DEFAULT 'DRAFT',
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "staffNote" TEXT,
    "customerResponseNote" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofApprovalToken" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofApprovalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "ProductionJobStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" "ProductionPriority" NOT NULL DEFAULT 'NORMAL',
    "requiredBy" DATE,
    "internalNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJobItem" (
    "id" TEXT NOT NULL,
    "productionJobId" TEXT NOT NULL,
    "quoteLineId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "colourSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ProductionItemStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ProductionJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDecorationTask" (
    "id" TEXT NOT NULL,
    "productionJobItemId" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "approvedProofId" TEXT,
    "approvedArtworkFileId" TEXT,
    "locationSnapshot" TEXT NOT NULL,
    "methodSnapshot" TEXT NOT NULL,
    "status" "ProductionTaskStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,

    CONSTRAINT "ProductionDecorationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRequirement" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteLineId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierVariantId" TEXT,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "supplierSkuSnapshot" TEXT,
    "stockSnapshot" INTEGER,
    "status" "SupplierRequirementStatus" NOT NULL DEFAULT 'REQUIRED',
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchaseDraft" (
    "id" TEXT NOT NULL,
    "draftNumber" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "internalNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPurchaseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchaseDraftItem" (
    "id" TEXT NOT NULL,
    "purchaseDraftId" TEXT NOT NULL,
    "supplierRequirementId" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "sizeSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "SupplierPurchaseDraftItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJobNumberCounter" (
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL,

    CONSTRAINT "ProductionJobNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "PurchaseDraftNumberCounter" (
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL,

    CONSTRAINT "PurchaseDraftNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "QuoteWorkflowEvent_quoteId_createdAt_idx" ON "QuoteWorkflowEvent"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtworkRevisionRequest_quoteId_status_idx" ON "ArtworkRevisionRequest"("quoteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkProof_storageKey_key" ON "ArtworkProof"("storageKey");

-- CreateIndex
CREATE INDEX "ArtworkProof_quoteId_status_idx" ON "ArtworkProof"("quoteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkProof_decorationId_version_key" ON "ArtworkProof"("decorationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProofApprovalToken_tokenHash_key" ON "ProofApprovalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ProofApprovalToken_proofId_expiresAt_idx" ON "ProofApprovalToken"("proofId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_quoteId_key" ON "ProductionJob"("quoteId");

-- CreateIndex
CREATE INDEX "ProductionJob_status_requiredBy_idx" ON "ProductionJob"("status", "requiredBy");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJobItem_productionJobId_quoteLineId_key" ON "ProductionJobItem"("productionJobId", "quoteLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDecorationTask_productionJobItemId_decorationId_key" ON "ProductionDecorationTask"("productionJobItemId", "decorationId");

-- CreateIndex
CREATE INDEX "SupplierRequirement_quoteId_status_idx" ON "SupplierRequirement"("quoteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierRequirement_quoteLineId_size_key" ON "SupplierRequirement"("quoteLineId", "size");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchaseDraft_draftNumber_key" ON "SupplierPurchaseDraft"("draftNumber");

-- CreateIndex
CREATE INDEX "SupplierPurchaseDraft_status_idx" ON "SupplierPurchaseDraft"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchaseDraft_quoteId_supplierId_key" ON "SupplierPurchaseDraft"("quoteId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchaseDraftItem_supplierRequirementId_key" ON "SupplierPurchaseDraftItem"("supplierRequirementId");

-- CreateIndex
CREATE INDEX "Quote_workflowStage_idx" ON "Quote"("workflowStage");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_artworkNoFileConfirmedById_fkey" FOREIGN KEY ("artworkNoFileConfirmedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_supplierRequirementWaivedById_fkey" FOREIGN KEY ("supplierRequirementWaivedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteWorkflowEvent" ADD CONSTRAINT "QuoteWorkflowEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteWorkflowEvent" ADD CONSTRAINT "QuoteWorkflowEvent_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkRevisionRequest" ADD CONSTRAINT "ArtworkRevisionRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkRevisionRequest" ADD CONSTRAINT "ArtworkRevisionRequest_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkRevisionRequest" ADD CONSTRAINT "ArtworkRevisionRequest_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "QuoteDecoration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkRevisionRequest" ADD CONSTRAINT "ArtworkRevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkRevisionRequest" ADD CONSTRAINT "ArtworkRevisionRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkProof" ADD CONSTRAINT "ArtworkProof_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkProof" ADD CONSTRAINT "ArtworkProof_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkProof" ADD CONSTRAINT "ArtworkProof_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "QuoteDecoration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkProof" ADD CONSTRAINT "ArtworkProof_sourceArtworkFileId_fkey" FOREIGN KEY ("sourceArtworkFileId") REFERENCES "ArtworkFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkProof" ADD CONSTRAINT "ArtworkProof_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofApprovalToken" ADD CONSTRAINT "ProofApprovalToken_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "ArtworkProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobItem" ADD CONSTRAINT "ProductionJobItem_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJobItem" ADD CONSTRAINT "ProductionJobItem_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDecorationTask" ADD CONSTRAINT "ProductionDecorationTask_productionJobItemId_fkey" FOREIGN KEY ("productionJobItemId") REFERENCES "ProductionJobItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDecorationTask" ADD CONSTRAINT "ProductionDecorationTask_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "QuoteDecoration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDecorationTask" ADD CONSTRAINT "ProductionDecorationTask_approvedProofId_fkey" FOREIGN KEY ("approvedProofId") REFERENCES "ArtworkProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDecorationTask" ADD CONSTRAINT "ProductionDecorationTask_approvedArtworkFileId_fkey" FOREIGN KEY ("approvedArtworkFileId") REFERENCES "ArtworkFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRequirement" ADD CONSTRAINT "SupplierRequirement_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRequirement" ADD CONSTRAINT "SupplierRequirement_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRequirement" ADD CONSTRAINT "SupplierRequirement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRequirement" ADD CONSTRAINT "SupplierRequirement_supplierVariantId_fkey" FOREIGN KEY ("supplierVariantId") REFERENCES "SupplierVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraft" ADD CONSTRAINT "SupplierPurchaseDraft_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraft" ADD CONSTRAINT "SupplierPurchaseDraft_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraft" ADD CONSTRAINT "SupplierPurchaseDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraftItem" ADD CONSTRAINT "SupplierPurchaseDraftItem_purchaseDraftId_fkey" FOREIGN KEY ("purchaseDraftId") REFERENCES "SupplierPurchaseDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseDraftItem" ADD CONSTRAINT "SupplierPurchaseDraftItem_supplierRequirementId_fkey" FOREIGN KEY ("supplierRequirementId") REFERENCES "SupplierRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Initialise immutable operational history for quotes that predate this workflow.
INSERT INTO "QuoteWorkflowEvent" ("id", "quoteId", "previousStage", "newStage", "note", "createdAt")
SELECT concat('workflow-backfill-', "id"), "id", NULL, 'QUOTE_SUBMITTED',
       'Operational workflow initialised for an existing quote.', CURRENT_TIMESTAMP
FROM "Quote";
