import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();

if (process.env.NODE_ENV === "production") {
  throw new Error("Controlled ingestion is disabled in production.");
}

const { database } = await import("../src/lib/database.ts");
const { premiumApparelClient } = await import(
  "../src/suppliers/premium-apparel/client.ts"
);
const {
  applyControlledPrices,
  applyControlledStock,
  ingestControlledProduct,
} = await import("../src/suppliers/premium-apparel/sync.ts");

const STYLE = "101CVC";

function justBefore(timestamp: string): string {
  return new Date(Date.parse(timestamp) - 1).toISOString();
}

async function counts() {
  const supplier = await database.supplier.findUniqueOrThrow({
    where: { slug: "premium-apparel" },
  });
  const supplierProduct = await database.supplierProduct.findUnique({
    where: {
      supplierId_supplierProductKey: {
        supplierId: supplier.id,
        supplierProductKey: STYLE,
      },
    },
  });

  if (!supplierProduct) {
    return {
      colours: 0,
      colourImages: 0,
      cxaProducts: await database.product.count(),
      heroImages: 0,
      supplierProducts: 0,
      variants: 0,
    };
  }

  const [colours, variants, heroImages, colourImages, cxaProducts] =
    await Promise.all([
      database.supplierColour.count({
        where: { supplierProductId: supplierProduct.id },
      }),
      database.supplierVariant.count({
        where: { supplierProductId: supplierProduct.id },
      }),
      database.supplierImage.count({
        where: { kind: "HERO", supplierProductId: supplierProduct.id },
      }),
      database.supplierImage.count({
        where: { kind: "COLOUR", supplierProductId: supplierProduct.id },
      }),
      database.product.count(),
    ]);

  return {
    colourImages,
    colours,
    cxaProducts,
    heroImages,
    supplierProducts: 1,
    variants,
  };
}

try {
  const before = await counts().catch(() => ({
    colourImages: 0,
    colours: 0,
    cxaProducts: 0,
    heroImages: 0,
    supplierProducts: 0,
    variants: 0,
  }));

  const stockResponse = await premiumApparelClient.getStock({ style: STYLE });
  const firstStock = stockResponse.items[0];
  if (!firstStock) throw new Error(`No stock records found for ${STYLE}.`);

  const product = await premiumApparelClient.findProductSince(
    STYLE,
    justBefore(firstStock.changed_at),
  );
  const timestampsBeforeProductSync = await database.supplierVariant.findMany({
    where: {
      supplierId: (await database.supplier.findUniqueOrThrow({
        where: { slug: "premium-apparel" },
      })).id,
      supplierProduct: { supplierProductKey: STYLE },
    },
    select: { priceUpdatedAt: true, sku: true, stockUpdatedAt: true },
  });
  const productResult = await ingestControlledProduct(
    product,
    stockResponse.as_of,
  );
  const timestampsAfterProductSync = await database.supplierVariant.findMany({
    where: {
      supplierId: (await database.supplier.findUniqueOrThrow({
        where: { slug: "premium-apparel" },
      })).id,
      supplierProduct: { supplierProductKey: STYLE },
    },
    select: { priceUpdatedAt: true, sku: true, stockUpdatedAt: true },
  });
  const afterTimestampBySku = new Map(
    timestampsAfterProductSync.map((variant) => [variant.sku, variant]),
  );
  const productMetadataPreservedVariantTimestamps =
    timestampsBeforeProductSync.length === 0 ||
    timestampsBeforeProductSync.every((beforeVariant) => {
      const afterVariant = afterTimestampBySku.get(beforeVariant.sku);
      return (
        afterVariant?.priceUpdatedAt?.getTime() ===
          beforeVariant.priceUpdatedAt?.getTime() &&
        afterVariant?.stockUpdatedAt?.getTime() ===
          beforeVariant.stockUpdatedAt?.getTime()
      );
    });
  const stockResult = await applyControlledStock(stockResponse);

  const skus = (product.colours ?? []).flatMap((colour) =>
    (colour.sizes ?? []).map((variant) => variant.sku),
  );
  const pricesResponse = await premiumApparelClient.getPrices({ sku: skus });
  const priceResult = await applyControlledPrices(pricesResponse);

  const supplier = await database.supplier.findUniqueOrThrow({
    where: { slug: "premium-apparel" },
  });
  const stored = await database.supplierProduct.findUniqueOrThrow({
    where: {
      supplierId_supplierProductKey: {
        supplierId: supplier.id,
        supplierProductKey: STYLE,
      },
    },
    include: {
      colours: true,
      images: true,
      variants: true,
    },
  });
  const syncStates = await database.supplierSyncState.findMany({
    where: { supplierId: supplier.id },
    select: { resource: true, status: true },
    orderBy: { resource: "asc" },
  });
  const after = await counts();

  const duplicateColourCount =
    stored.colours.length -
    new Set(stored.colours.map((colour) => colour.colourCode)).size;
  const duplicateSkuCount =
    stored.variants.length -
    new Set(stored.variants.map((variant) => variant.sku)).size;
  const duplicateImageCount =
    stored.images.length - new Set(stored.images.map((image) => image.url)).size;

  const verificationPassed =
    stored.active &&
    stored.supplierProductKey === STYLE &&
    Boolean(stored.supplierTitle) &&
    Boolean(stored.supplierBrand) &&
    Boolean(stored.supplierCategory) &&
    stored.variants.every(
      (variant) =>
        variant.supplierVariantId &&
        variant.stockUpdatedAt &&
        variant.priceUpdatedAt,
    ) &&
    duplicateColourCount === 0 &&
    duplicateSkuCount === 0 &&
    duplicateImageCount === 0 &&
    productMetadataPreservedVariantTimestamps &&
    after.cxaProducts === before.cxaProducts &&
    syncStates.every((state) => state.status === "SUCCEEDED");

  console.log(
    JSON.stringify(
      {
        command: "Premium Apparel controlled ingestion",
        style: STYLE,
        before,
        after,
        ingested: {
          colourImages: after.colourImages,
          colours: after.colours,
          heroImages: after.heroImages,
          priceRecordsUpdated: priceResult.processed,
          productRecordsUpdated: productResult.processed,
          skippedRecords:
            productResult.skipped + stockResult.skipped + priceResult.skipped,
          stockRecordsUpdated: stockResult.processed,
          supplierProducts: after.supplierProducts,
          variants: after.variants,
        },
        duplicates: {
          colours: duplicateColourCount,
          images: duplicateImageCount,
          skus: duplicateSkuCount,
        },
        cxaProductCreated: after.cxaProducts > before.cxaProducts,
        productMetadataPreservedVariantTimestamps,
        syncStates,
        databaseVerification: verificationPassed ? "passed" : "failed",
      },
      null,
      2,
    ),
  );

  if (!verificationPassed) process.exitCode = 1;
} finally {
  await database.$disconnect();
}
