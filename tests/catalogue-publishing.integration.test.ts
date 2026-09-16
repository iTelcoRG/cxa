import assert from "node:assert/strict";
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

const forbiddenKeys = [
  "supplierPrice",
  "rawData",
  "supplierVariantId",
  "supplierId",
  "supplierProductId",
  "apiKey",
  "authorization",
  "DATABASE_URL",
  "syncState",
  "stock",
];

function assertNoForbiddenKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    assert.ok(
      !forbiddenKeys.some((forbidden) => key.toLowerCase() === forbidden.toLowerCase()),
      `Public DTO leaked forbidden key: ${key}`,
    );
    assertNoForbiddenKeys(nested);
  }
}

test(
  "publishing is explicit, customer-safe, and idempotent",
  { skip: !database },
  async () => {
    assert.ok(database);
    const supplierProduct = await database.supplierProduct.findFirstOrThrow({
      where: { style: "101CVC", supplier: { slug: "premium-apparel" } },
      select: { id: true },
    });
    const { publishSupplierProductToCXA } = await import(
      "../src/catalogue/publishing.ts"
    );
    const { getPublishedProductBySlug, listPublishedProducts } = await import(
      "../src/catalogue/customer.ts"
    );

    const first = await publishSupplierProductToCXA({
      supplierProductId: supplierProduct.id,
      status: "DRAFT",
    });
    assert.equal(await getPublishedProductBySlug(first.product.slug), null);
    assert.ok(!(await listPublishedProducts()).some((item) => item.id === first.product.id));

    const second = await publishSupplierProductToCXA({
      supplierProductId: supplierProduct.id,
      status: "PUBLISHED",
    });
    const third = await publishSupplierProductToCXA({
      supplierProductId: supplierProduct.id,
      status: "PUBLISHED",
    });
    assert.equal(first.product.id, second.product.id);
    assert.equal(second.product.id, third.product.id);
    assert.equal(third.created, false);
    assert.equal(
      await database.productSupplier.count({
        where: { productId: third.product.id, supplierProductId: supplierProduct.id },
      }),
      1,
    );

    const publicProduct = await getPublishedProductBySlug(third.product.slug);
    assert.ok(publicProduct);
    assert.equal(publicProduct.status, "PUBLISHED");
    assert.equal(publicProduct.colours.length, 6);
    assert.equal(
      publicProduct.colours.reduce((count, colour) => count + colour.variants.length, 0),
      30,
    );
    assertNoForbiddenKeys(publicProduct);
    const serialized = JSON.stringify(publicProduct);
    assert.ok(!serialized.includes("7.3"));
    assert.ok(!serialized.includes("test-only-api-key-sentinel"));
    assert.ok(!serialized.includes(process.env.DATABASE_URL ?? "__unset__"));

    const colour = publicProduct.colours.find((item) =>
      item.variants.some((variant) => variant.availability !== "OUT_OF_STOCK"),
    );
    const variant = colour?.variants.find(
      (item) => item.availability !== "OUT_OF_STOCK",
    );
    assert.ok(colour && variant);
    const { validateQuoteLineServer } = await import(
      "../src/quote/server-validation.ts"
    );
    const serverValidation = await validateQuoteLineServer({
      quoteLineId: "server-validation-test",
      productId: publicProduct.id,
      productSlug: publicProduct.slug,
      productName: publicProduct.name,
      colourCode: colour.code,
      colourDescription: colour.description,
      productImage: publicProduct.primaryImage,
      sizeQuantities: { [variant.size]: 1 },
      totalGarmentQuantity: 1,
      decorations: [{ location: "FRONT_LEFT_CHEST", method: "DTF" }],
    });
    assert.equal(serverValidation.valid, true);

    const black = publicProduct.colours.find(
      (item) => item.description.toLowerCase() === "black",
    );
    const alternate = publicProduct.colours.find(
      (item) => item.code !== black?.code,
    );
    const blackSizes = black?.variants
      .filter((item) => item.availability !== "OUT_OF_STOCK")
      .slice(0, 2);
    const alternateSize = alternate?.variants.find(
      (item) => item.availability !== "OUT_OF_STOCK",
    );
    assert.ok(black && alternate && blackSizes?.length === 2 && alternateSize);
    const configurationA = await validateQuoteLineServer({
      quoteLineId: "configuration-a",
      productId: publicProduct.id,
      productSlug: publicProduct.slug,
      productName: publicProduct.name,
      colourCode: black.code,
      colourDescription: black.description,
      productImage: black.images[0] ?? publicProduct.primaryImage,
      sizeQuantities: {
        [blackSizes[0]!.size]: 2,
        [blackSizes[1]!.size]: 3,
      },
      totalGarmentQuantity: 5,
      decorations: [
        { location: "FRONT_LEFT_CHEST", method: "DTF" },
        { location: "BACK_FULL", method: "SCREEN_PRINT" },
      ],
    });
    const configurationB = await validateQuoteLineServer({
      quoteLineId: "configuration-b",
      productId: publicProduct.id,
      productSlug: publicProduct.slug,
      productName: publicProduct.name,
      colourCode: alternate.code,
      colourDescription: alternate.description,
      productImage: alternate.images[0] ?? publicProduct.primaryImage,
      sizeQuantities: { [alternateSize.size]: 4 },
      totalGarmentQuantity: 4,
      decorations: [{ location: "FRONT_CENTRE", method: "DTF" }],
    });
    assert.ok(configurationA.valid && configurationA.line);
    assert.ok(configurationB.valid && configurationB.line);
    const { addQuoteLine } = await import("../src/quote/cart.ts");
    const verifiedCart = addQuoteLine(
      addQuoteLine({ version: 1, lines: [] }, configurationA.line),
      configurationB.line,
    );
    assert.equal(verifiedCart.lines.length, 2);
    assert.equal(verifiedCart.lines[0]?.productId, verifiedCart.lines[1]?.productId);
    assert.notEqual(verifiedCart.lines[0]?.quoteLineId, verifiedCart.lines[1]?.quoteLineId);

    await database.product.update({
      where: { id: third.product.id },
      data: { status: "ARCHIVED" },
    });
    assert.equal(await getPublishedProductBySlug(third.product.slug), null);
    await publishSupplierProductToCXA({
      supplierProductId: supplierProduct.id,
      status: "PUBLISHED",
    });
  },
);
