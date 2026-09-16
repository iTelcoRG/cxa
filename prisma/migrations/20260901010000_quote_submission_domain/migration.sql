CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'QUOTED', 'APPROVED', 'DECLINED', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'PICKUP', 'TO_BE_CONFIRMED');
CREATE TYPE "DecorationLocation" AS ENUM ('FRONT_LEFT_CHEST', 'FRONT_RIGHT_CHEST', 'FRONT_CENTRE', 'FRONT_FULL', 'BACK_UPPER', 'BACK_FULL', 'LEFT_SLEEVE', 'RIGHT_SLEEVE');
CREATE TYPE "DecorationMethod" AS ENUM ('SCREEN_PRINT', 'EMBROIDERY', 'DTF');
CREATE TYPE "QuoteEventType" AS ENUM ('QUOTE_SUBMITTED', 'STAFF_NOTIFICATION_SENT', 'STAFF_NOTIFICATION_FAILED', 'CUSTOMER_CONFIRMATION_SENT', 'CUSTOMER_CONFIRMATION_FAILED');

CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "quoteNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "confirmationToken" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
  "customerName" TEXT NOT NULL,
  "businessName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "requiredBy" DATE,
  "deliveryMethod" "DeliveryMethod",
  "deliveryAddress" TEXT,
  "customerNotes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteLine" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT,
  "productNameSnapshot" TEXT NOT NULL,
  "productSlugSnapshot" TEXT NOT NULL,
  "brandSnapshot" TEXT,
  "categorySnapshot" TEXT,
  "colourCode" TEXT NOT NULL,
  "colourDescription" TEXT NOT NULL,
  "imageUrl" TEXT,
  "customerNotes" TEXT,
  "totalQuantity" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteLineSize" (
  "id" TEXT NOT NULL,
  "quoteLineId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteLineSize_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteDecoration" (
  "id" TEXT NOT NULL,
  "quoteLineId" TEXT NOT NULL,
  "location" "DecorationLocation" NOT NULL,
  "locationLabel" TEXT NOT NULL,
  "method" "DecorationMethod" NOT NULL,
  "methodLabel" TEXT NOT NULL,
  "customerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteDecoration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteEvent" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "eventType" "QuoteEventType" NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteNumberCounter" (
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL,
  CONSTRAINT "QuoteNumberCounter_pkey" PRIMARY KEY ("year")
);

CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE UNIQUE INDEX "Quote_idempotencyKey_key" ON "Quote"("idempotencyKey");
CREATE UNIQUE INDEX "Quote_confirmationToken_key" ON "Quote"("confirmationToken");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_submittedAt_idx" ON "Quote"("submittedAt");
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");
CREATE INDEX "QuoteLine_productId_idx" ON "QuoteLine"("productId");
CREATE UNIQUE INDEX "QuoteLineSize_quoteLineId_size_key" ON "QuoteLineSize"("quoteLineId", "size");
CREATE UNIQUE INDEX "QuoteDecoration_quoteLineId_location_key" ON "QuoteDecoration"("quoteLineId", "location");
CREATE INDEX "QuoteEvent_quoteId_createdAt_idx" ON "QuoteEvent"("quoteId", "createdAt");

ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteLineSize" ADD CONSTRAINT "QuoteLineSize_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteDecoration" ADD CONSTRAINT "QuoteDecoration_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "QuoteLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
