import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicProduct } from "../src/catalogue/customer.ts";
import {
  addQuoteLine,
  clearQuoteCart,
  deserializeQuoteCart,
  editQuoteLine,
  removeQuoteLine,
  serializeQuoteCart,
  totalGarmentQuantity,
} from "../src/quote/cart.ts";
import { EMPTY_QUOTE_CART, type QuoteLine } from "../src/quote/types.ts";
import { validateQuoteLineAgainstProduct } from "../src/quote/validation.ts";

const product: PublicProduct = {
  brand: "CXA Test",
  category: "Tanks",
  colours: [
    {
      code: "BL",
      description: "Black",
      images: ["https://ik.imagekit.io/premiumapparel/test-black.jpg"],
      variants: [
        { availability: "IN_STOCK", size: "S" },
        { availability: "LOW_STOCK", size: "M" },
        { availability: "OUT_OF_STOCK", size: "L" },
      ],
    },
    {
      code: "WH",
      description: "White",
      images: [],
      variants: [{ availability: "IN_STOCK", size: "S" }],
    },
  ],
  decorations: { dtf: true, embroidery: false, screenPrint: true },
  description: "Safe product",
  featured: false,
  galleryImages: [],
  id: "cxa-product-1",
  name: "CXA Test Tank",
  newProduct: false,
  primaryImage: null,
  sizeChartHtml: "",
  slug: "cxa-test-tank",
  status: "PUBLISHED",
};

function line(overrides: Partial<QuoteLine> = {}): QuoteLine {
  return {
    quoteLineId: "line-1",
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    colourCode: "BL",
    colourDescription: "Black",
    productImage: null,
    sizeQuantities: { S: 2, M: 1 },
    totalGarmentQuantity: 3,
    decorations: [{ location: "FRONT_LEFT_CHEST", method: "DTF" }],
    ...overrides,
  };
}

test("cart adds multiple configurations of the same product", () => {
  const first = addQuoteLine(EMPTY_QUOTE_CART, line());
  const second = addQuoteLine(first, line({ quoteLineId: "line-2", colourCode: "WH", colourDescription: "White", sizeQuantities: { S: 4 }, totalGarmentQuantity: 4 }));
  assert.equal(second.lines.length, 2);
  assert.equal(new Set(second.lines.map((item) => item.quoteLineId)).size, 2);
});

test("cart serialization persists only versioned safe data", () => {
  const cart = addQuoteLine(EMPTY_QUOTE_CART, line());
  assert.deepEqual(deserializeQuoteCart(serializeQuoteCart(cart)), cart);
});

test("malformed and confidential localStorage payloads reset safely", () => {
  assert.deepEqual(deserializeQuoteCart("not-json"), EMPTY_QUOTE_CART);
  assert.deepEqual(deserializeQuoteCart('{"version":2,"lines":[]}'), EMPTY_QUOTE_CART);
  const leaked = JSON.stringify({ version: 1, lines: [{ ...line(), rawData: { hidden: true } }] });
  assert.deepEqual(deserializeQuoteCart(leaked), EMPTY_QUOTE_CART);
  const hostileImage = JSON.stringify({
    version: 1,
    lines: [{ ...line(), productImage: "https://evil.example/tracker.jpg" }],
  });
  assert.deepEqual(deserializeQuoteCart(hostileImage), EMPTY_QUOTE_CART);
  const duplicateLocation = JSON.stringify({
    version: 1,
    lines: [{ ...line(), decorations: [
      { location: "FRONT_LEFT_CHEST", method: "DTF" },
      { location: "FRONT_LEFT_CHEST", method: "SCREEN_PRINT" },
    ] }],
  });
  assert.deepEqual(deserializeQuoteCart(duplicateLocation), EMPTY_QUOTE_CART);
});

test("cart edit, remove, clear, and total operations are immutable", () => {
  const original = addQuoteLine(EMPTY_QUOTE_CART, line());
  const edited = editQuoteLine(original, line({ sizeQuantities: { S: 7 }, totalGarmentQuantity: 7 }));
  assert.equal(original.lines[0]?.totalGarmentQuantity, 3);
  assert.equal(edited.lines[0]?.totalGarmentQuantity, 7);
  assert.equal(totalGarmentQuantity(edited), 7);
  assert.equal(removeQuoteLine(edited, "line-1").lines.length, 0);
  assert.deepEqual(clearQuoteCart(), EMPTY_QUOTE_CART);
});

test("zero, negative, and fractional quantities are rejected", () => {
  assert.equal(validateQuoteLineAgainstProduct(line({ sizeQuantities: { S: 0 }, totalGarmentQuantity: 0 }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ sizeQuantities: { S: -1 }, totalGarmentQuantity: -1 }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ sizeQuantities: { S: 1.5 }, totalGarmentQuantity: 1.5 }), product).valid, false);
});

test("out-of-stock, invalid colour, and invalid size selections are rejected", () => {
  assert.equal(validateQuoteLineAgainstProduct(line({ sizeQuantities: { L: 1 }, totalGarmentQuantity: 1 }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ colourCode: "NO", colourDescription: "No colour" }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ sizeQuantities: { XL: 1 }, totalGarmentQuantity: 1 }), product).valid, false);
});

test("invalid, disabled, and duplicate decoration selections are rejected", () => {
  assert.equal(validateQuoteLineAgainstProduct(line({ decorations: [{ location: "INVALID" as never, method: "DTF" }] }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ decorations: [{ location: "FRONT_LEFT_CHEST", method: "EMBROIDERY" }] }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ decorations: [
    { location: "FRONT_LEFT_CHEST", method: "DTF" },
    { location: "FRONT_LEFT_CHEST", method: "SCREEN_PRINT" },
  ] }), product).valid, false);
});

test("low stock is allowed and quantities are normalized without exact stock", () => {
  const result = validateQuoteLineAgainstProduct(line({ sizeQuantities: { S: 0, M: 2 }, totalGarmentQuantity: 2 }), product);
  assert.equal(result.valid, true);
  assert.deepEqual(result.line?.sizeQuantities, { M: 2 });
  assert.equal("stock" in (result.line ?? {}), false);
});

test("customer notes are trimmed and HTML-like or oversized notes are rejected", () => {
  const safe = validateQuoteLineAgainstProduct(line({
    customerNotes: "  Please call first  ",
    decorations: [{ location: "FRONT_LEFT_CHEST", method: "DTF", note: "  White logo  " }],
  }), product);
  assert.equal(safe.line?.customerNotes, "Please call first");
  assert.equal(safe.line?.decorations[0]?.note, "White logo");
  assert.equal(validateQuoteLineAgainstProduct(line({ customerNotes: "<strong>unsafe</strong>" }), product).valid, false);
  assert.equal(validateQuoteLineAgainstProduct(line({ customerNotes: "x".repeat(501) }), product).valid, false);
});

test("cart state never gains supplier fields or exact stock", () => {
  const serialized = serializeQuoteCart(addQuoteLine(EMPTY_QUOTE_CART, line()));
  for (const forbidden of ["supplierPrice", "rawData", "supplierVariantId", "supplierProductId", '"stock"']) {
    assert.ok(!serialized.includes(forbidden));
  }
});
