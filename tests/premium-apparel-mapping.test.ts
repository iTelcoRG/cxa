import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deduplicateImageUrls,
  extractRemovedStyles,
  mapPremiumApparelProduct,
  toDecimalPrice,
} from "../src/suppliers/premium-apparel/mapping.ts";
import type { PremiumApparelProductSample } from "../src/suppliers/premium-apparel/types.ts";

function productFixture(
  overrides: Partial<PremiumApparelProductSample> = {},
): PremiumApparelProductSample {
  return {
    brand: "Test Brand",
    category: "T-Shirts",
    colours: [
      {
        description: "Black",
        images: ["https://images.example/black.png"],
        name: "BL",
        sizes: [
          {
            price: "07.3000",
            size: "M",
            sku: "SUP-X-OS-M",
            stock: 12,
          },
        ],
      },
    ],
    fabric: "Cotton",
    features: "Tear-away label",
    hero: ["https://images.example/hero.png"],
    html_description: "<p>Description</p>",
    size_chart: "<table></table>",
    style: "STYLE-1",
    title: "Test Product",
    ...overrides,
  };
}

test("maps observed product fields without deriving SKU or product identity", () => {
  const mapped = mapPremiumApparelProduct(productFixture());

  assert.equal(mapped.supplierProductKey, "STYLE-1");
  assert.equal(mapped.style, "STYLE-1");
  assert.equal(mapped.variants[0]?.sku, "SUP-X-OS-M");
  assert.equal(mapped.variants[0]?.supplierVariantId, null);
  assert.equal(mapped.variants[0]?.supplierPrice, "7.3");
});

test("deduplicates image URLs while preserving first-seen order", () => {
  assert.deepEqual(
    deduplicateImageUrls(["https://a", "https://a", " https://b ", ""]),
    ["https://a", "https://b"],
  );

  const mapped = mapPremiumApparelProduct(
    productFixture({
      hero: ["https://same", "https://same"],
      colours: [
        {
          description: "Black",
          images: ["https://same", "https://colour", "https://colour"],
          name: "BL",
          sizes: [],
        },
      ],
    }),
  );
  assert.deepEqual(
    mapped.images.map((image) => image.url),
    ["https://same", "https://colour"],
  );
});

test("normalizes API price strings for PostgreSQL Decimal storage", () => {
  assert.equal(toDecimalPrice("00024.9500"), "24.95");
  assert.equal(toDecimalPrice("7.3"), "7.3");
  assert.equal(toDecimalPrice("0"), "0");
  assert.throws(() => toDecimalPrice("$7.30"));
});

test("maps absent optional text_description to null", () => {
  const mapped = mapPremiumApparelProduct(productFixture());
  assert.equal(mapped.textDescription, null);
});

test("accepts empty product and colour image arrays", () => {
  const mapped = mapPremiumApparelProduct(
    productFixture({
      hero: [],
      colours: [
        { description: "Black", images: [], name: "BL", sizes: [] },
      ],
    }),
  );
  assert.deepEqual(mapped.images, []);
});

test("normalizes and deduplicates removed_styles entries", () => {
  assert.deepEqual(
    extractRemovedStyles([
      "STYLE-1",
      { style: "STYLE-2", removed_at: "2026-08-31T00:00:00Z" },
      "STYLE-1",
      { unknown: true },
    ]),
    ["STYLE-1", "STYLE-2"],
  );
});

test("schema scopes SKU uniqueness to supplier", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /@@unique\(\[supplierId, sku\]\)/);
  assert.doesNotMatch(schema, /sku\s+String\s+@unique/);
});
