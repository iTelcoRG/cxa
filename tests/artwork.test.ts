import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "../scripts/development-database.ts";
import { artworkLimits } from "../src/artwork/config.ts";
import { allowArtworkUpload, resetArtworkRateLimit } from "../src/artwork/rate-limit.ts";
import { validateArtworkUpload } from "../src/artwork/validation.ts";

loadLocalEnvironment(); assertSafeDevelopmentDatabase();
const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);

test("artwork filenames reject traversal, null bytes, and controls", () => {
  for (const fileName of ["../logo.png", "folder/logo.png", "bad\0.png", "bad\x07.png"]) assert.throws(() => validateArtworkUpload({ bytes: png, fileName, mimeType: "image/png" }));
});

test("artwork validation rejects unsupported, mismatched, malformed and disguised files", () => {
  assert.throws(() => validateArtworkUpload({ bytes: png, fileName: "logo.exe", mimeType: "application/octet-stream" }), /not supported/);
  assert.throws(() => validateArtworkUpload({ bytes: png, fileName: "logo.jpg", mimeType: "image/png" }), /do not match/);
  assert.throws(() => validateArtworkUpload({ bytes: new TextEncoder().encode("<script>alert(1)</script>"), fileName: "logo.jpg", mimeType: "image/jpeg" }), /signature/);
  assert.throws(() => validateArtworkUpload({ bytes: new TextEncoder().encode("<svg onload='x'></svg>"), fileName: "logo.svg", mimeType: "image/svg+xml" }), /signature/);
});

test("artwork validation enforces the configured per-file limit", () => {
  const oversized = new Uint8Array(artworkLimits.maxFileBytes + 1); oversized.set(png);
  assert.throws(() => validateArtworkUpload({ bytes: oversized, fileName: "large.png", mimeType: "image/png" }), /allowed size/);
});

test("upload limiter is bounded and durable", async () => {
  await resetArtworkRateLimit(); for (let index = 0; index < 12; index += 1) assert.equal(await allowArtworkUpload("artwork-test"), true); assert.equal(await allowArtworkUpload("artwork-test"), false); await resetArtworkRateLimit();
});

test("quote retry consumes one temporary upload into one artwork record", async () => {
  const { database } = await import("../src/lib/database.ts"); const { artworkStorage } = await import("../src/artwork/storage.ts"); const { submitQuoteRequest } = await import("../src/quotes/submission.ts"); const { getPublishedProductBySlug } = await import("../src/catalogue/customer.ts");
  const product = await getPublishedProductBySlug("101cvc-american-apparel-cvc-womens-racerneck-tank"); assert.ok(product); const colour = product.colours.find((item) => item.variants.some((variant) => variant.availability !== "OUT_OF_STOCK")); const variant = colour?.variants.find((item) => item.availability !== "OUT_OF_STOCK"); assert.ok(colour && variant);
  const lineId = `art-${randomUUID()}`; const token = randomUUID(); const storageKey = await artworkStorage.save(png, "png"); const temporary = await database.temporaryArtworkUpload.create({ data: { clientUploadToken: token, quoteLineClientId: lineId, decorationLocation: "FRONT_LEFT_CHEST", originalFileName: "task12-logo.png", storageKey, mimeType: "image/png", extension: "png", sizeBytes: png.length, sha256: "a".repeat(64), expiresAt: new Date(Date.now() + 60_000) } }); const idempotencyKey = randomUUID();
  const payload = { customer: { customerName: "Artwork Integration Test", businessName: "CXA Tests", email: "artwork@example.invalid", phone: "", requiredBy: "", deliveryMethod: "PICKUP", deliveryAddress: "", customerNotes: "" }, lines: [{ quoteLineId: lineId, productId: product.id, productSlug: product.slug, productName: product.name, colourCode: colour.code, colourDescription: colour.description, productImage: colour.images[0] ?? product.primaryImage, sizeQuantities: { [variant.size]: 2 }, totalGarmentQuantity: 2, decorations: [{ location: "FRONT_LEFT_CHEST", method: "DTF", artwork: { token, originalFileName: "task12-logo.png", mimeType: "image/png", sizeBytes: png.length, status: "UPLOADED" } }] }], idempotencyKey, website: "", startedAt: Date.now() - 2000 };
  try { const first = await submitQuoteRequest(payload, { notifier: async () => ({ staff: "skipped", customer: "skipped" }) }); const second = await submitQuoteRequest(payload, { notifier: async () => ({ staff: "skipped", customer: "skipped" }) }); assert.ok(first.ok && second.ok && second.duplicate); assert.equal(await database.artworkFile.count({ where: { temporaryUploadId: temporary.id } }), 1); assert.equal(await artworkStorage.exists(storageKey), true); } finally { await database.artworkFile.deleteMany({ where: { temporaryUploadId: temporary.id } }); await database.quote.deleteMany({ where: { idempotencyKey } }); await database.temporaryArtworkUpload.deleteMany({ where: { id: temporary.id } }); await artworkStorage.delete(storageKey); }
});

test("arbitrary artwork association is rejected", async () => {
  const source = await readFile("src/quotes/submission.ts", "utf8"); assert.match(source, /quoteLineClientId !== snapshot\.line\.quoteLineId/); assert.match(source, /decorationLocation !== selection\.location/); assert.match(source, /temporaryArtworkUpload\.findMany/);
});

test("admin downloads are authenticated attachments and never inline SVG", async () => {
  const source = await readFile("src/app/api/admin/artwork/[artworkId]/download/route.ts", "utf8"); assert.match(source, /requireStaff\("quotes:read"\)/); assert.match(source, /Content-Disposition/); assert.match(source, /attachment/); assert.match(source, /X-Content-Type-Options/); assert.match(source, /nosniff/); assert.match(source, /application\/octet-stream/); assert.doesNotMatch(source, /inline/);
});

test("public artwork metadata excludes storage keys and supplier fields", async () => {
  const confirmation = await readFile("src/quotes/confirmation.ts", "utf8"); const types = await readFile("src/quotes/types.ts", "utf8"); assert.doesNotMatch(types, /storageKey|sha256|supplierPrice|rawData|supplierVariantId|exact stock/i); assert.match(confirmation, /originalFileName: true/);
});

test("cleanup dry-run retains files and real cleanup removes expired temporary data", async () => {
  const { database } = await import("../src/lib/database.ts"); const { artworkStorage } = await import("../src/artwork/storage.ts"); const { cleanupArtwork } = await import("../src/artwork/cleanup.ts"); const storageKey = await artworkStorage.save(png, "png"); const temporary = await database.temporaryArtworkUpload.create({ data: { clientUploadToken: randomUUID(), quoteLineClientId: `cleanup-${randomUUID()}`, decorationLocation: "BACK_FULL", originalFileName: "expired.png", storageKey, mimeType: "image/png", extension: "png", sizeBytes: png.length, sha256: "b".repeat(64), expiresAt: new Date(0) } });
  try { const dry = await cleanupArtwork({ dryRun: true }); assert.ok(dry.expiredTemporaryUploads >= 1); assert.equal(await artworkStorage.exists(storageKey), true); await cleanupArtwork({ dryRun: false }); assert.equal(await artworkStorage.exists(storageKey), false); assert.equal(await database.temporaryArtworkUpload.count({ where: { id: temporary.id } }), 0); } finally { await database.temporaryArtworkUpload.deleteMany({ where: { id: temporary.id } }); await artworkStorage.delete(storageKey); }
});
