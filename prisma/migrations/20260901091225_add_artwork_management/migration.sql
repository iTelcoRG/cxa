-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('UPLOADED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ArtworkScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'NOT_SCANNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_APPROVED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_REJECTED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_ARCHIVED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'ARTWORK_DOWNLOADED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteEventType" ADD VALUE 'ARTWORK_UPLOADED';
ALTER TYPE "QuoteEventType" ADD VALUE 'ARTWORK_APPROVED';
ALTER TYPE "QuoteEventType" ADD VALUE 'ARTWORK_REJECTED';
ALTER TYPE "QuoteEventType" ADD VALUE 'ARTWORK_ARCHIVED';
ALTER TYPE "QuoteEventType" ADD VALUE 'ARTWORK_DOWNLOADED';

-- CreateTable
CREATE TABLE "TemporaryArtworkUpload" (
    "id" TEXT NOT NULL,
    "clientUploadToken" TEXT NOT NULL,
    "quoteLineClientId" TEXT NOT NULL,
    "decorationLocation" "DecorationLocation",
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryArtworkUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkFile" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "quoteLineId" TEXT,
    "decorationId" TEXT,
    "temporaryUploadId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "ArtworkStatus" NOT NULL DEFAULT 'UPLOADED',
    "scanStatus" "ArtworkScanStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "customerLabel" TEXT,
    "staffNote" TEXT,
    "rejectionReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryArtworkUpload_clientUploadToken_key" ON "TemporaryArtworkUpload"("clientUploadToken");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryArtworkUpload_storageKey_key" ON "TemporaryArtworkUpload"("storageKey");

-- CreateIndex
CREATE INDEX "TemporaryArtworkUpload_expiresAt_consumedAt_idx" ON "TemporaryArtworkUpload"("expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "TemporaryArtworkUpload_quoteLineClientId_idx" ON "TemporaryArtworkUpload"("quoteLineClientId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkFile_temporaryUploadId_key" ON "ArtworkFile"("temporaryUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkFile_storageKey_key" ON "ArtworkFile"("storageKey");

-- CreateIndex
CREATE INDEX "ArtworkFile_quoteId_status_idx" ON "ArtworkFile"("quoteId", "status");

-- CreateIndex
CREATE INDEX "ArtworkFile_quoteLineId_idx" ON "ArtworkFile"("quoteLineId");

-- CreateIndex
CREATE INDEX "ArtworkFile_decorationId_idx" ON "ArtworkFile"("decorationId");

-- CreateIndex
CREATE INDEX "ArtworkFile_sha256_idx" ON "ArtworkFile"("sha256");

-- AddForeignKey
ALTER TABLE "ArtworkFile" ADD CONSTRAINT "ArtworkFile_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkFile" ADD CONSTRAINT "ArtworkFile_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkFile" ADD CONSTRAINT "ArtworkFile_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "QuoteDecoration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkFile" ADD CONSTRAINT "ArtworkFile_temporaryUploadId_fkey" FOREIGN KEY ("temporaryUploadId") REFERENCES "TemporaryArtworkUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
