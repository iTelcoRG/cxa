-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SupplierConnectionType" AS ENUM ('API', 'CSV', 'XLSX', 'MANUAL');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SupplierSyncResource" AS ENUM ('PRODUCTS', 'STOCK', 'PRICES');

-- CreateEnum
CREATE TYPE "SupplierSyncStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SupplierImageKind" AS ENUM ('HERO', 'COLOUR');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "connectionType" "SupplierConnectionType" NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "apiBaseUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "SupplierSyncStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierProductKey" TEXT NOT NULL,
    "style" TEXT,
    "supplierTitle" TEXT NOT NULL,
    "supplierBrand" TEXT NOT NULL,
    "supplierCategory" TEXT NOT NULL,
    "fabric" TEXT,
    "features" TEXT,
    "htmlDescription" TEXT,
    "textDescription" TEXT,
    "sizeChart" TEXT,
    "rawData" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierColour" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "colourCode" TEXT NOT NULL,
    "colourDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierColour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierVariant" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierColourId" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "supplierVariantId" TEXT,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "supplierPrice" DECIMAL(12,4) NOT NULL,
    "priceUpdatedAt" TIMESTAMP(3),
    "stockUpdatedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierImage" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "supplierColourId" TEXT,
    "url" TEXT NOT NULL,
    "kind" "SupplierImageKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brandId" TEXT,
    "categoryId" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "newProduct" BOOLEAN NOT NULL DEFAULT false,
    "screenPrint" BOOLEAN NOT NULL DEFAULT false,
    "embroidery" BOOLEAN NOT NULL DEFAULT false,
    "dtf" BOOLEAN NOT NULL DEFAULT false,
    "primaryImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSupplier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "preferredSupplier" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSyncState" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "resource" "SupplierSyncResource" NOT NULL,
    "lastSuccessfulCursor" TEXT,
    "lastAttemptedAt" TIMESTAMP(3),
    "status" "SupplierSyncStatus" NOT NULL DEFAULT 'IDLE',
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");

-- CreateIndex
CREATE INDEX "SupplierProduct_style_idx" ON "SupplierProduct"("style");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierBrand_idx" ON "SupplierProduct"("supplierBrand");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierCategory_idx" ON "SupplierProduct"("supplierCategory");

-- CreateIndex
CREATE INDEX "SupplierProduct_active_idx" ON "SupplierProduct"("active");

-- CreateIndex
CREATE INDEX "SupplierProduct_lastSyncedAt_idx" ON "SupplierProduct"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_supplierProductKey_key" ON "SupplierProduct"("supplierId", "supplierProductKey");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierColour_supplierProductId_colourCode_key" ON "SupplierColour"("supplierProductId", "colourCode");

-- CreateIndex
CREATE INDEX "SupplierVariant_supplierProductId_idx" ON "SupplierVariant"("supplierProductId");

-- CreateIndex
CREATE INDEX "SupplierVariant_supplierColourId_idx" ON "SupplierVariant"("supplierColourId");

-- CreateIndex
CREATE INDEX "SupplierVariant_active_idx" ON "SupplierVariant"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierVariant_supplierId_sku_key" ON "SupplierVariant"("supplierId", "sku");

-- CreateIndex
CREATE INDEX "SupplierImage_supplierColourId_idx" ON "SupplierImage"("supplierColourId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierImage_supplierProductId_url_key" ON "SupplierImage"("supplierProductId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_active_idx" ON "Brand"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "Category"("active");

-- CreateIndex
CREATE INDEX "ProductSupplier_supplierProductId_idx" ON "ProductSupplier"("supplierProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSupplier_productId_supplierProductId_key" ON "ProductSupplier"("productId", "supplierProductId");

-- CreateIndex
CREATE INDEX "SupplierSyncState_status_idx" ON "SupplierSyncState"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierSyncState_supplierId_resource_key" ON "SupplierSyncState"("supplierId", "resource");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierColour" ADD CONSTRAINT "SupplierColour_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVariant" ADD CONSTRAINT "SupplierVariant_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVariant" ADD CONSTRAINT "SupplierVariant_supplierColourId_fkey" FOREIGN KEY ("supplierColourId") REFERENCES "SupplierColour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierVariant" ADD CONSTRAINT "SupplierVariant_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierImage" ADD CONSTRAINT "SupplierImage_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierImage" ADD CONSTRAINT "SupplierImage_supplierColourId_fkey" FOREIGN KEY ("supplierColourId") REFERENCES "SupplierColour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSyncState" ADD CONSTRAINT "SupplierSyncState_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
