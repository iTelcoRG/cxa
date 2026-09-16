import "server-only";

import type { PrismaClient } from "../../generated/prisma/client.ts";
import { Prisma } from "../../generated/prisma/client.ts";
import { database } from "../../lib/database.ts";
import { premiumApparelClient } from "./client.ts";
import { PremiumApparelError } from "./errors.ts";
import {
  extractRemovedSkus,
  extractRemovedStyles,
  mapPremiumApparelPrice,
  mapPremiumApparelProduct,
  mapPremiumApparelStock,
} from "./mapping.ts";
import type {
  PremiumApparelItemResponse,
  PremiumApparelPriceItem,
  PremiumApparelProductSample,
  PremiumApparelProductsSinceResponse,
  PremiumApparelStockItem,
} from "./types.ts";
import { streamPremiumApparelProducts } from "./streaming.ts";

const PREMIUM_APPAREL_SLUG = "premium-apparel";
const DEFAULT_BATCH_SIZE = 50;

type SyncResource = "PRODUCTS" | "STOCK" | "PRICES";

export interface SupplierSyncResult {
  cursor: string;
  processed: number;
  removed: number;
  skipped: number;
}

interface SyncOptions {
  batchSize?: number;
  pricesResponse?: PremiumApparelItemResponse<PremiumApparelPriceItem>;
  productsResponse?: PremiumApparelProductsSinceResponse;
  stockResponse?: PremiumApparelItemResponse<PremiumApparelStockItem>;
}

export interface FullProductSyncResult extends SupplierSyncResult {
  added: number;
  updated: number;
  colours: number;
  variants: number;
  images: number;
}

export class SupplierProductMappingError extends Error {
  constructor() { super("A supplier product could not be mapped."); this.name = "SupplierProductMappingError"; }
}

export class SupplierProductPersistenceError extends Error {
  readonly databaseCode: string | null;
  readonly databaseErrorName: string | null;
  readonly validationField: string | null;
  constructor(cause: unknown) { super("A mapped supplier product batch could not be persisted."); this.name = "SupplierProductPersistenceError"; this.databaseCode = cause instanceof Prisma.PrismaClientKnownRequestError ? cause.code : null; this.databaseErrorName = cause instanceof Error && cause.name.startsWith("Prisma") ? cause.name : null; const candidate = cause instanceof Error ? /(?:argument|Argument) `([^`]+)`/.exec(cause.message)?.[1] : undefined; this.validationField = candidate && ["stock", "size", "sku", "supplierPrice", "supplierTitle", "supplierBrand", "supplierCategory", "colourCode", "colourDescription", "url"].includes(candidate) ? candidate : null; }
}

export async function syncProductsFull(
  onProgress?: (progress: { batchNumber: number; products: number; colours: number; variants: number; images: number }) => Promise<void>,
): Promise<FullProductSyncResult> {
  const supplier = await getPremiumApparelSupplier(database);
  await markAttempt(database, supplier.id, "PRODUCTS");
  const batchSize = Number(process.env.PREMIUM_APPAREL_SYNC_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
  let processed = 0; let added = 0; let updated = 0; let colours = 0; let variants = 0; let images = 0;
  try {
    const response = await premiumApparelClient.getProductsResponse("1970-01-01T00:00:00.000Z");
    const summary = await streamPremiumApparelProducts(response, batchSize, async (sourceProducts, batchNumber) => {
      let mapped: ReturnType<typeof mapPremiumApparelProduct>[];
      try { mapped = sourceProducts.map(mapPremiumApparelProduct); } catch { throw new SupplierProductMappingError(); }
      const existing = new Set((await database.supplierProduct.findMany({ where: { supplierId: supplier.id, supplierProductKey: { in: mapped.map((x) => x.supplierProductKey) } }, select: { supplierProductKey: true } })).map((x) => x.supplierProductKey));
      try { await persistMappedProducts(supplier.id, mapped); } catch (cause) { throw new SupplierProductPersistenceError(cause); }
      processed += mapped.length; added += mapped.filter((x) => !existing.has(x.supplierProductKey)).length; updated += mapped.filter((x) => existing.has(x.supplierProductKey)).length;
      colours += mapped.reduce((n, x) => n + x.colours.length, 0); variants += mapped.reduce((n, x) => n + x.variants.length, 0); images += mapped.reduce((n, x) => n + x.images.length, 0);
      await onProgress?.({ batchNumber, products: processed, colours, variants, images });
    });
    const removedStyles = extractRemovedStyles(summary.removedStyles);
    if (removedStyles.length) await deactivateRemovedStyles(supplier.id, removedStyles);
    await markSuccess(database, supplier.id, "PRODUCTS", summary.asOf);
    return { cursor: summary.asOf, processed, added, updated, colours, variants, images, removed: removedStyles.length, skipped: 0 };
  } catch (cause) { await markFailure(database, supplier.id, "PRODUCTS", cause); throw cause; }
}

async function persistMappedProducts(supplierId: string, products: ReturnType<typeof mapPremiumApparelProduct>[]): Promise<void> {
  await database.$transaction(async (transaction) => {
    for (const product of products) {
      const supplierProduct = await transaction.supplierProduct.upsert({ where: { supplierId_supplierProductKey: { supplierId, supplierProductKey: product.supplierProductKey } }, create: { active: true, fabric: product.fabric, features: product.features, htmlDescription: product.htmlDescription, lastSyncedAt: new Date(), rawData: product.rawData as unknown as Prisma.InputJsonValue, sizeChart: product.sizeChart, style: product.style, supplierBrand: product.supplierBrand, supplierCategory: product.supplierCategory, supplierId, supplierProductKey: product.supplierProductKey, supplierTitle: product.supplierTitle, textDescription: product.textDescription }, update: { active: true, fabric: product.fabric, features: product.features, htmlDescription: product.htmlDescription, lastSyncedAt: new Date(), rawData: product.rawData as unknown as Prisma.InputJsonValue, sizeChart: product.sizeChart, style: product.style, supplierBrand: product.supplierBrand, supplierCategory: product.supplierCategory, supplierTitle: product.supplierTitle, textDescription: product.textDescription } });
      const colourIds = new Map<string, string>();
      for (const colour of product.colours) { const stored = await transaction.supplierColour.upsert({ where: { supplierProductId_colourCode: { supplierProductId: supplierProduct.id, colourCode: colour.colourCode } }, create: { ...colour, supplierProductId: supplierProduct.id }, update: { colourDescription: colour.colourDescription } }); colourIds.set(colour.colourCode, stored.id); }
      for (const variant of product.variants) { const supplierColourId = colourIds.get(variant.colourCode); if (!supplierColourId) continue; await transaction.supplierVariant.upsert({ where: { supplierId_sku: { supplierId, sku: variant.sku } }, create: { active: true, size: variant.size, sku: variant.sku, stock: variant.stock, supplierColourId, supplierId, supplierPrice: variant.supplierPrice, supplierProductId: supplierProduct.id, supplierVariantId: variant.supplierVariantId }, update: { active: true, size: variant.size, supplierColourId, supplierProductId: supplierProduct.id } }); }
      await transaction.supplierVariant.updateMany({ where: { supplierProductId: supplierProduct.id, sku: { notIn: product.variants.map((x) => x.sku) } }, data: { active: false } });
      for (const image of product.images) await transaction.supplierImage.upsert({ where: { supplierProductId_url: { supplierProductId: supplierProduct.id, url: image.url } }, create: { kind: image.kind, sortOrder: image.sortOrder, supplierColourId: image.colourCode ? (colourIds.get(image.colourCode) ?? null) : null, supplierProductId: supplierProduct.id, url: image.url }, update: { kind: image.kind, sortOrder: image.sortOrder, supplierColourId: image.colourCode ? (colourIds.get(image.colourCode) ?? null) : null } });
    }
  }, { timeout: 60_000 });
}

export async function deactivateRemovedStyles(supplierId: string, removedStyles: string[]): Promise<void> {
  await database.$transaction([database.supplierProduct.updateMany({ where: { supplierId, supplierProductKey: { in: removedStyles } }, data: { active: false } }), database.supplierVariant.updateMany({ where: { supplierId, supplierProduct: { supplierProductKey: { in: removedStyles } } }, data: { active: false } })]);
}

async function getPremiumApparelSupplier(db: PrismaClient) {
  return db.supplier.upsert({
    where: { slug: PREMIUM_APPAREL_SLUG },
    create: {
      apiBaseUrl: process.env.PREMIUM_APPAREL_API_URL ?? null,
      connectionType: "API",
      name: "Premium Apparel",
      slug: PREMIUM_APPAREL_SLUG,
      status: "ACTIVE",
    },
    update: {
      apiBaseUrl: process.env.PREMIUM_APPAREL_API_URL ?? undefined,
    },
  });
}

async function markAttempt(
  db: PrismaClient,
  supplierId: string,
  resource: SyncResource,
): Promise<void> {
  await db.supplierSyncState.upsert({
    where: { supplierId_resource: { resource, supplierId } },
    create: {
      lastAttemptedAt: new Date(),
      resource,
      status: "RUNNING",
      supplierId,
    },
    update: {
      errorSummary: null,
      lastAttemptedAt: new Date(),
      status: "RUNNING",
    },
  });
}

async function markSuccess(
  db: PrismaClient,
  supplierId: string,
  resource: SyncResource,
  cursor: string,
): Promise<void> {
  await db.$transaction([
    db.supplierSyncState.update({
      where: { supplierId_resource: { resource, supplierId } },
      data: {
        errorSummary: null,
        lastSuccessfulCursor: cursor,
        status: "SUCCEEDED",
      },
    }),
    db.supplier.update({
      where: { id: supplierId },
      data: { lastSyncAt: new Date(), lastSyncStatus: "SUCCEEDED" },
    }),
  ]);
}

async function markFailure(
  db: PrismaClient,
  supplierId: string,
  resource: SyncResource,
  cause: unknown,
): Promise<void> {
  const errorSummary =
    cause instanceof PremiumApparelError
      ? `${cause.code}${cause.status ? ` (${cause.status})` : ""}`
      : "unexpected_error";

  await db.$transaction([
    db.supplierSyncState.update({
      where: { supplierId_resource: { resource, supplierId } },
      data: { errorSummary, status: "FAILED" },
    }),
    db.supplier.update({
      where: { id: supplierId },
      data: { lastSyncStatus: "FAILED" },
    }),
  ]);
}

export async function syncProductsIncremental(
  since: string,
  options: SyncOptions = {},
): Promise<SupplierSyncResult> {
  const supplier = await getPremiumApparelSupplier(database);
  await markAttempt(database, supplier.id, "PRODUCTS");

  try {
    const response =
      options.productsResponse ??
      (await premiumApparelClient.getProductsSince(since));
    const products = response.products.map(mapPremiumApparelProduct);

    for (const batch of batches(products, options.batchSize)) {
      await database.$transaction(async (transaction) => {
        for (const product of batch) {
          const supplierProduct = await transaction.supplierProduct.upsert({
            where: {
              supplierId_supplierProductKey: {
                supplierId: supplier.id,
                supplierProductKey: product.supplierProductKey,
              },
            },
            create: {
              active: true,
              fabric: product.fabric,
              features: product.features,
              htmlDescription: product.htmlDescription,
              lastSyncedAt: new Date(),
              rawData: product.rawData as unknown as Prisma.InputJsonValue,
              sizeChart: product.sizeChart,
              style: product.style,
              supplierBrand: product.supplierBrand,
              supplierCategory: product.supplierCategory,
              supplierId: supplier.id,
              supplierProductKey: product.supplierProductKey,
              supplierTitle: product.supplierTitle,
              textDescription: product.textDescription,
            },
            update: {
              active: true,
              fabric: product.fabric,
              features: product.features,
              htmlDescription: product.htmlDescription,
              lastSyncedAt: new Date(),
              rawData: product.rawData as unknown as Prisma.InputJsonValue,
              sizeChart: product.sizeChart,
              style: product.style,
              supplierBrand: product.supplierBrand,
              supplierCategory: product.supplierCategory,
              supplierTitle: product.supplierTitle,
              textDescription: product.textDescription,
            },
          });

          const colourIds = new Map<string, string>();
          for (const colour of product.colours) {
            const storedColour = await transaction.supplierColour.upsert({
              where: {
                supplierProductId_colourCode: {
                  colourCode: colour.colourCode,
                  supplierProductId: supplierProduct.id,
                },
              },
              create: { ...colour, supplierProductId: supplierProduct.id },
              update: { colourDescription: colour.colourDescription },
            });
            colourIds.set(colour.colourCode, storedColour.id);
          }

          for (const variant of product.variants) {
            const supplierColourId = colourIds.get(variant.colourCode);
            if (!supplierColourId) continue;

            await transaction.supplierVariant.upsert({
              where: { supplierId_sku: { sku: variant.sku, supplierId: supplier.id } },
              create: {
                active: true,
                size: variant.size,
                sku: variant.sku,
                stock: variant.stock,
                supplierColourId,
                supplierId: supplier.id,
                supplierPrice: variant.supplierPrice,
                supplierProductId: supplierProduct.id,
                supplierVariantId: variant.supplierVariantId,
              },
              update: {
                active: true,
                size: variant.size,
                supplierColourId,
                supplierProductId: supplierProduct.id,
              },
            });
          }

          await transaction.supplierVariant.updateMany({
            where: {
              supplierProductId: supplierProduct.id,
              sku: { notIn: product.variants.map((variant) => variant.sku) },
            },
            data: { active: false },
          });

          for (const image of product.images) {
            await transaction.supplierImage.upsert({
              where: {
                supplierProductId_url: {
                  supplierProductId: supplierProduct.id,
                  url: image.url,
                },
              },
              create: {
                kind: image.kind,
                sortOrder: image.sortOrder,
                supplierColourId: image.colourCode
                  ? (colourIds.get(image.colourCode) ?? null)
                  : null,
                supplierProductId: supplierProduct.id,
                url: image.url,
              },
              update: {
                kind: image.kind,
                sortOrder: image.sortOrder,
                supplierColourId: image.colourCode
                  ? (colourIds.get(image.colourCode) ?? null)
                  : null,
              },
            });
          }
        }
      });
    }

    const removedStyles = extractRemovedStyles(response.removed_styles);
    if (removedStyles.length) {
      await database.$transaction([
        database.supplierProduct.updateMany({
          where: {
            supplierId: supplier.id,
            supplierProductKey: { in: removedStyles },
          },
          data: { active: false },
        }),
        database.supplierVariant.updateMany({
          where: {
            supplierId: supplier.id,
            supplierProduct: { supplierProductKey: { in: removedStyles } },
          },
          data: { active: false },
        }),
      ]);
    }

    await markSuccess(database, supplier.id, "PRODUCTS", response.as_of);
    return {
      cursor: response.as_of,
      processed: products.length,
      removed: removedStyles.length,
      skipped: 0,
    };
  } catch (cause) {
    await markFailure(database, supplier.id, "PRODUCTS", cause);
    throw cause;
  }
}

export async function syncStockIncremental(
  since: string,
  options: SyncOptions = {},
): Promise<SupplierSyncResult> {
  return syncVariantsIncremental("STOCK", since, options);
}

export async function ingestControlledProduct(
  product: PremiumApparelProductSample,
  cursor: string,
): Promise<SupplierSyncResult> {
  return syncProductsIncremental(cursor, {
    productsResponse: {
      as_of: cursor,
      as_of_epoch_ms: Date.parse(cursor),
      count: 1,
      products: [product],
      removed_styles: [],
    },
  });
}

export async function applyControlledStock(
  response: PremiumApparelItemResponse<PremiumApparelStockItem>,
): Promise<SupplierSyncResult> {
  return syncVariantsIncremental("STOCK", response.as_of, {
    stockResponse: response,
  });
}

export async function applyControlledPrices(
  response: PremiumApparelItemResponse<PremiumApparelPriceItem>,
): Promise<SupplierSyncResult> {
  return syncVariantsIncremental("PRICES", response.as_of, {
    pricesResponse: response,
  });
}

export async function syncPricesIncremental(
  since: string,
  options: SyncOptions = {},
): Promise<SupplierSyncResult> {
  return syncVariantsIncremental("PRICES", since, options);
}

async function syncVariantsIncremental(
  resource: "STOCK" | "PRICES",
  since: string,
  options: SyncOptions,
): Promise<SupplierSyncResult> {
  const supplier = await getPremiumApparelSupplier(database);
  await markAttempt(database, supplier.id, resource);

  try {
    const response =
      resource === "STOCK"
        ? (options.stockResponse ??
          (await premiumApparelClient.getStock({ since })))
        : (options.pricesResponse ??
          (await premiumApparelClient.getPrices({ since })));
    const mapped = response.items.map((item) =>
      resource === "STOCK"
        ? mapPremiumApparelStock(item as Parameters<typeof mapPremiumApparelStock>[0])
        : mapPremiumApparelPrice(item as Parameters<typeof mapPremiumApparelPrice>[0]),
    );
    let skipped = 0;

    for (const batch of batches(mapped, options.batchSize)) {
      await database.$transaction(async (transaction) => {
        for (const variant of batch) {
          if (resource === "PRICES" && "supplierPrice" in variant && variant.supplierPrice === null) {
            skipped += 1;
            continue;
          }
          const existing = await transaction.supplierVariant.findUnique({
            where: { supplierId_sku: { sku: variant.sku, supplierId: supplier.id } },
            select: { id: true },
          });

          if (!existing) {
            skipped += 1;
            continue;
          }

          await transaction.supplierVariant.update({
            where: { id: existing.id },
            data:
              resource === "STOCK"
                ? {
                    active: true,
                    stock: "stock" in variant ? variant.stock : undefined,
                    stockUpdatedAt: variant.changedAt,
                    supplierVariantId: variant.productId,
                  }
                : {
                    active: true,
                    priceUpdatedAt: variant.changedAt,
                    supplierPrice:
                      "supplierPrice" in variant
                        ? variant.supplierPrice
                        : undefined,
                    supplierVariantId: variant.productId,
                  },
          });
        }
      });
    }

    const removedSkus = extractRemovedSkus(response.removed ?? []);
    if (removedSkus.length) {
      await database.supplierVariant.updateMany({
        where: { supplierId: supplier.id, sku: { in: removedSkus } },
        data: { active: false },
      });
    }

    await markSuccess(database, supplier.id, resource, response.as_of);
    return {
      cursor: response.as_of,
      processed: mapped.length - skipped,
      removed: removedSkus.length,
      skipped,
    };
  } catch (cause) {
    await markFailure(database, supplier.id, resource, cause);
    throw cause;
  }
}

function batches<T>(items: readonly T[], batchSize = DEFAULT_BATCH_SIZE): T[][] {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Sync batch size must be a positive integer.");
  }

  const result: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    result.push(items.slice(index, index + batchSize));
  }
  return result;
}
