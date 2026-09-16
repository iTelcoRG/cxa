import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";

import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "../scripts/development-database.ts";

loadLocalEnvironment();

let safeDatabase = true;
try {
  assertSafeDevelopmentDatabase();
} catch {
  safeDatabase = false;
}

const database = safeDatabase
  ? (await import("../src/lib/database.ts")).database
  : null;

after(async () => {
  await database?.$disconnect();
});

test(
  "controlled ingestion is present, idempotent, and supplier-only",
  { skip: !database },
  async () => {
    assert.ok(database);
    const supplier = await database.supplier.findUniqueOrThrow({
      where: { slug: "premium-apparel" },
    });
    const product = await database.supplierProduct.findUniqueOrThrow({
      where: {
        supplierId_supplierProductKey: {
          supplierId: supplier.id,
          supplierProductKey: "101CVC",
        },
      },
      include: { colours: true, images: true, variants: true },
    });

    assert.equal(product.active, true);
    assert.equal(product.colours.length, 6);
    assert.equal(product.variants.length, 30);
    assert.equal(product.images.length, 10);
    assert.equal(
      new Set(product.colours.map((colour) => colour.colourCode)).size,
      product.colours.length,
    );
    assert.equal(
      new Set(product.images.map((image) => image.url)).size,
      product.images.length,
    );
  },
);

test(
  "stored variants preserve supplied identifiers and authoritative updates",
  { skip: !database },
  async () => {
    assert.ok(database);
    const supplier = await database.supplier.findUniqueOrThrow({
      where: { slug: "premium-apparel" },
    });
    const variant = await database.supplierVariant.findUniqueOrThrow({
      where: {
        supplierId_sku: {
          sku: "A101CVC2BL-LS",
          supplierId: supplier.id,
        },
      },
    });

    assert.equal(variant.sku, "A101CVC2BL-LS");
    assert.equal(variant.supplierVariantId, "A101CVC2BL");
    assert.ok(variant.stockUpdatedAt);
    assert.ok(variant.priceUpdatedAt);
    assert.ok(variant.supplierPrice?.isPositive());
  },
);

test("controlled CLI source does not include pricing in sanitized output", async () => {
  const source = await readFile(
    "scripts/premium-apparel-ingest-test.ts",
    "utf8",
  );
  assert.doesNotMatch(source, /supplierPrice/);
  assert.doesNotMatch(source, /Authorization/);
  assert.doesNotMatch(source, /PREMIUM_APPAREL_API_KEY/);
});

test("supplier sync has no automatic catalogue publishing dependency", async () => {
  const source = await readFile(
    "src/suppliers/premium-apparel/sync.ts",
    "utf8",
  );
  assert.doesNotMatch(source, /publishSupplierProductToCXA/);
  assert.doesNotMatch(source, /catalogue\/publishing/);
});

test(
  "stock updates skip an unknown supplied SKU instead of inventing it",
  { skip: !database },
  async () => {
    assert.ok(database);
    const before = await database.supplierVariant.count();
    const { applyControlledStock } = await import(
      "../src/suppliers/premium-apparel/sync.ts"
    );
    const result = await applyControlledStock({
      as_of: "2026-08-31T12:00:00.000Z",
      as_of_epoch_ms: 1788177600000,
      count: 1,
      items: [
        {
          changed_at: "2026-08-31T12:00:00.000Z",
          colour: "ZZ",
          colour_description: "Unknown",
          product_id: "DO-NOT-DERIVE",
          size: "M",
          sku: "UNKNOWN-SUPPLIED-SKU-M",
          stock: 1,
          style: "UNKNOWN-STYLE",
        },
      ],
    });

    assert.equal(result.processed, 0);
    assert.equal(result.skipped, 1);
    assert.equal(await database.supplierVariant.count(), before);
    assert.equal(
      await database.supplierVariant.count({
        where: { sku: "UNKNOWN-SUPPLIED-SKU-M" },
      }),
      0,
    );
  },
);
