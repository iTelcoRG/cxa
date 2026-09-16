import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "../scripts/development-database.ts";

loadLocalEnvironment();
let safeDatabase = true;
try { assertSafeDevelopmentDatabase(); } catch { safeDatabase = false; }
const database = safeDatabase ? (await import("../src/lib/database.ts")).database : null;
const keys = [
  "ba7a0000-0000-4000-8000-000000000001",
  "ba7a0000-0000-4000-8000-000000000002",
  "ba7a0000-0000-4000-8000-000000000003",
  "ba7a0000-0000-4000-8000-000000000004",
];

after(async () => {
  if (database) await database.quote.deleteMany({ where: { idempotencyKey: { in: keys } } });
  await database?.$disconnect();
});

async function validPayload(idempotencyKey: string) {
  assert.ok(database);
  const { getPublishedProductBySlug } = await import("../src/catalogue/customer.ts");
  const product = await getPublishedProductBySlug("101cvc-american-apparel-cvc-womens-racerneck-tank");
  assert.ok(product);
  const colour = product.colours.find((item) =>
    item.variants.some((variant) => variant.availability !== "OUT_OF_STOCK"),
  );
  const sizes = colour?.variants.filter((item) => item.availability !== "OUT_OF_STOCK").slice(0, 2);
  assert.ok(colour && sizes?.length === 2);
  return {
    customer: {
      customerName: "Quote Integration Test",
      businessName: "CXA Tests",
      email: "quote-test@example.invalid",
      phone: "+64 21 000 0000",
      requiredBy: "",
      deliveryMethod: "PICKUP",
      deliveryAddress: "",
      customerNotes: "Integration verification",
    },
    lines: [{
      quoteLineId: `line-${idempotencyKey.slice(-4)}`,
      productId: product.id,
      productSlug: product.slug,
      productName: "Untrusted name is canonicalized",
      colourCode: colour.code,
      colourDescription: colour.description,
      productImage: colour.images[0] ?? product.primaryImage,
      sizeQuantities: { [sizes[0]!.size]: 2, [sizes[1]!.size]: 3 },
      totalGarmentQuantity: 5,
      decorations: [
        { location: "FRONT_LEFT_CHEST", method: "DTF", note: "White logo" },
        { location: "BACK_FULL", method: "SCREEN_PRINT" },
      ],
    }],
    idempotencyKey,
    website: "",
    startedAt: Date.now() - 2_000,
  };
}

test("valid quote persists immutable snapshots and failed notifications do not remove it", { skip: !database }, async () => {
  assert.ok(database);
  const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
  const payload = await validPayload(keys[0]!);
  const result = await submitQuoteRequest(payload, {
    notifier: async () => ({ staff: "failed", customer: "failed" }),
  });
  assert.ok(result.ok);
  assert.match(result.quoteNumber, /^CXA-\d{4}-\d{5}$/);
  const stored = await database.quote.findUniqueOrThrow({
    where: { idempotencyKey: keys[0] },
    include: { events: true, lines: { include: { sizes: true, decorations: true } } },
  });
  assert.equal(stored.status, "SUBMITTED");
  assert.equal(stored.lines[0]?.productNameSnapshot, "101CVC American Apparel CVC Womens Racerneck Tank");
  assert.equal(stored.lines[0]?.totalQuantity, 5);
  assert.equal(stored.lines[0]?.sizes.length, 2);
  assert.equal(stored.lines[0]?.decorations.length, 2);
  assert.ok(stored.events.some((event) => event.eventType === "QUOTE_SUBMITTED"));
  assert.ok(stored.events.some((event) => event.eventType === "STAFF_NOTIFICATION_FAILED"));
  assert.ok(stored.events.some((event) => event.eventType === "CUSTOMER_CONFIRMATION_FAILED"));
  const serialized = JSON.stringify(stored);
  assert.doesNotMatch(serialized, /supplierPrice|rawData|supplierVariantId|DATABASE_URL|PREMIUM_APPAREL_API_KEY|Authorization/);
  assert.equal(Object.hasOwn(stored.lines[0] ?? {}, "stock"), false);
});

test("idempotency returns the existing quote without duplication", { skip: !database }, async () => {
  assert.ok(database);
  const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
  const payload = await validPayload(keys[1]!);
  const first = await submitQuoteRequest(payload, { notifier: async () => ({ staff: "skipped", customer: "skipped" }) });
  const second = await submitQuoteRequest(payload, { notifier: async () => ({ staff: "skipped", customer: "skipped" }) });
  assert.ok(first.ok && second.ok);
  assert.equal(first.quoteNumber, second.quoteNumber);
  assert.equal(second.duplicate, true);
  assert.equal(await database.quote.count({ where: { idempotencyKey: keys[1] } }), 1);
});

test("concurrent submissions receive unique database-numbered quotes", { skip: !database }, async () => {
  const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
  const [first, second] = await Promise.all([
    submitQuoteRequest(await validPayload(keys[2]!), { notifier: async () => ({ staff: "skipped", customer: "skipped" }) }),
    submitQuoteRequest(await validPayload(keys[3]!), { notifier: async () => ({ staff: "skipped", customer: "skipped" }) }),
  ]);
  assert.ok(first.ok && second.ok);
  assert.notEqual(first.quoteNumber, second.quoteNumber);
});

test("invalid cart selections reject the whole submission", { skip: !database }, async () => {
  assert.ok(database);
  const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
  const payload = await validPayload("ba7a0000-0000-4000-8000-000000000099");
  payload.lines[0]!.colourCode = "INVALID";
  const before = await database.quote.count();
  const result = await submitQuoteRequest(payload);
  assert.equal(result.ok, false);
  assert.equal(await database.quote.count(), before);
});

test("draft and archived products are rejected by submission revalidation", { skip: !database }, async () => {
  assert.ok(database);
  const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
  const draft = await database.product.create({
    data: { name: "Task 7 Draft Test", slug: "task-7-draft-test", status: "DRAFT" },
  });
  const archived = await database.product.create({
    data: { name: "Task 7 Archived Test", slug: "task-7-archived-test", status: "ARCHIVED" },
  });
  try {
    for (const [index, product] of [draft, archived].entries()) {
      const payload = await validPayload(
        `ba7a0000-0000-4000-8000-00000000010${index}`,
      );
      payload.lines[0]!.productId = product.id;
      payload.lines[0]!.productSlug = product.slug;
      const result = await submitQuoteRequest(payload);
      assert.equal(result.ok, false);
    }
  } finally {
    await database.product.deleteMany({ where: { id: { in: [draft.id, archived.id] } } });
  }
});

test("opaque token gates deliberately safe confirmation output", { skip: !database }, async () => {
  assert.ok(database);
  const quote = await database.quote.findUniqueOrThrow({ where: { idempotencyKey: keys[0] } });
  const { getSafeQuoteConfirmation } = await import("../src/quotes/confirmation.ts");
  assert.equal(await getSafeQuoteConfirmation(quote.quoteNumber, "wrong-token"), null);
  const confirmation = await getSafeQuoteConfirmation(quote.quoteNumber, quote.confirmationToken);
  assert.ok(confirmation);
  const serialized = JSON.stringify(confirmation);
  assert.doesNotMatch(serialized, /email|phone|address|notes|supplier|stock|rawData|Price|database/i);
});

test("migration uses a dedicated counter rather than count-based numbering", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/quotes/submission.ts", "utf8");
  assert.match(source, /quoteNumberCounter\.upsert/);
  assert.doesNotMatch(source, /quote\.count/);
});
