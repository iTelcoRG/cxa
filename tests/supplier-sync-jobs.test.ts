import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "../scripts/development-database.ts";
import { streamPremiumApparelProducts } from "../src/suppliers/premium-apparel/streaming.ts";
import { can } from "../src/admin/permissions.ts";
import { PremiumApparelError } from "../src/suppliers/premium-apparel/errors.ts";
import { mapPremiumApparelPrice } from "../src/suppliers/premium-apparel/mapping.ts";

loadLocalEnvironment(); assertSafeDevelopmentDatabase();

const sample = { brand: "Test Brand", category: "Test Category", colours: [{ description: "Black", images: ["https://example.invalid/black.jpg"], name: "BLK", sizes: [{ price: "10.00", size: "M", sku: "TASK11-SKU", stock: 2 }] }], fabric: "Cotton", features: "Test", hero: ["https://example.invalid/hero.jpg"], html_description: "<p>Test</p>", size_chart: "", style: "TASK11", text_description: "Test", title: "Task 11 Fixture" };

test("streaming product parser batches records and returns independent response metadata", async () => {
  const source = JSON.stringify({ as_of: "2026-09-01T00:00:00.000Z", as_of_epoch_ms: 1, count: 2, products: [sample, { ...sample, style: "TASK11-B", colours: [] }], removed_styles: [{ style: "OLD" }] });
  const bytes = new TextEncoder().encode(source); const stream = new ReadableStream({ start(controller) { for (let i=0;i<bytes.length;i+=37) controller.enqueue(bytes.slice(i,i+37)); controller.close(); } });
  const batches: unknown[][] = []; const result = await streamPremiumApparelProducts(new Response(stream), 1, async (batch) => { batches.push(batch); }, 1_000_000);
  assert.equal(batches.length, 2); assert.equal(result.count, 2); assert.equal(result.asOf, "2026-09-01T00:00:00.000Z"); assert.deepEqual(result.removedStyles, [{ style: "OLD" }]);
});

test("streaming parser enforces a configured maximum response size", async () => {
  await assert.rejects(streamPremiumApparelProducts(new Response(JSON.stringify({ as_of: "x", products: [sample], removed_styles: [] })), 50, async () => {}, 20), /size limit/);
});

test("database supplier lock is atomic, denies overlap, and releases", async () => {
  const { database } = await import("../src/lib/database.ts"); const { acquireSupplierSyncLock, releaseSupplierSyncLock } = await import("../src/suppliers/premium-apparel/jobs.ts"); const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" } });
  const [one,two] = await Promise.all(["FULL","PRODUCTS_INCREMENTAL"].map((syncType) => database.supplierSyncRun.create({ data: { supplierId: supplier.id, syncType: syncType as "FULL"|"PRODUCTS_INCREMENTAL", triggerType: "DEVELOPMENT", status: "RUNNING" } })));
  try { assert.equal(await acquireSupplierSyncLock(one.id), true); assert.equal(await acquireSupplierSyncLock(two.id), false); await releaseSupplierSyncLock(one.id); assert.equal(await acquireSupplierSyncLock(two.id), true); } finally { await releaseSupplierSyncLock(one.id); await releaseSupplierSyncLock(two.id); await database.supplierSyncRun.deleteMany({ where: { id: { in: [one.id,two.id] } } }); }
});

test("worker atomically claims only one queued job", async () => {
  const { database } = await import("../src/lib/database.ts"); const { claimNextSyncRun } = await import("../src/suppliers/premium-apparel/jobs.ts"); const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" } }); const run = await database.supplierSyncRun.create({ data: { supplierId: supplier.id, syncType: "PRODUCTS_INCREMENTAL", triggerType: "DEVELOPMENT" } });
  try { const [a,b] = await Promise.all([claimNextSyncRun(),claimNextSyncRun()]); assert.equal([a,b].filter((x)=>x?.id===run.id).length,1); } finally { await database.supplierSyncRun.deleteMany({ where: { id: run.id } }); }
});

test("safe failure summaries expose no upstream details or secrets", async () => {
  const { safeFailureSummary } = await import("../src/suppliers/premium-apparel/jobs.ts");
  const summary = safeFailureSummary(new PremiumApparelError("Authorization Bearer secret supplierPrice", { code: "upstream_unavailable", status: 503 })); assert.equal(summary, "Premium Apparel sync failed due to upstream service unavailability."); assert.doesNotMatch(summary,/Authorization|secret|Price/);
});

test("undocumented non-decimal prices remain pending instead of being invented", () => {
  const mapped = mapPremiumApparelPrice({ sku: "SAFE-SKU", product_id: "SAFE", style: "SAFE", colour: "BLK", size: "M", price: "not-available", changed_at: "2026-09-01T00:00:00.000Z" });
  assert.equal(mapped.supplierPrice, null);
});

test("503 responses receive limited retries and then succeed", async () => {
  const previousUrl = process.env.PREMIUM_APPAREL_API_URL; const previousKey = process.env.PREMIUM_APPAREL_API_KEY;
  process.env.PREMIUM_APPAREL_API_URL = "https://supplier.invalid"; process.env.PREMIUM_APPAREL_API_KEY = "test-only";
  let calls = 0;
  try {
    const { PremiumApparelClient } = await import("../src/suppliers/premium-apparel/client.ts");
    const client = new PremiumApparelClient({ fetch: async () => { calls += 1; return calls < 3 ? new Response(JSON.stringify({ error: "upstream_unavailable", message: "Unavailable" }), { status: 503 }) : new Response(JSON.stringify({ as_of: "2026-09-01T00:00:00.000Z", as_of_epoch_ms: 1, count: 0, items: [] })); } });
    const result = await client.getStock({ since: "2026-08-31T00:00:00.000Z" }); assert.equal(result.count, 0); assert.equal(calls, 3);
  } finally { if (previousUrl === undefined) delete process.env.PREMIUM_APPAREL_API_URL; else process.env.PREMIUM_APPAREL_API_URL = previousUrl; if (previousKey === undefined) delete process.env.PREMIUM_APPAREL_API_KEY; else process.env.PREMIUM_APPAREL_API_KEY = previousKey; }
});

test("removed styles preserve CXA products, links, and historical quotes", async () => {
  const { database } = await import("../src/lib/database.ts"); const { deactivateRemovedStyles } = await import("../src/suppliers/premium-apparel/sync.ts");
  const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" } }); const cxaProduct = await database.product.findFirstOrThrow({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true } }); const quoteCount = await database.quote.count();
  const source = await database.supplierProduct.create({ data: { supplierId: supplier.id, supplierProductKey: "TASK11-REMOVED", style: "TASK11-REMOVED", supplierTitle: "Removal fixture", supplierBrand: "Fixture", supplierCategory: "Fixture", lastSyncedAt: new Date(), colours: { create: { colourCode: "BLK", colourDescription: "Black" } }, catalogueLinks: { create: { productId: cxaProduct.id } } }, include: { colours: true } });
  await database.supplierVariant.create({ data: { supplierId: supplier.id, supplierProductId: source.id, supplierColourId: source.colours[0].id, sku: "TASK11-REMOVED-BLK-M", size: "M", stock: 1, supplierPrice: null } });
  try { await deactivateRemovedStyles(supplier.id, [source.supplierProductKey]); const stored = await database.supplierProduct.findUniqueOrThrow({ where: { id: source.id }, include: { variants: true, catalogueLinks: true } }); assert.equal(stored.active, false); assert.ok(stored.variants.every((variant) => !variant.active)); assert.equal(stored.catalogueLinks.length, 1); assert.deepEqual(await database.product.findUniqueOrThrow({ where: { id: cxaProduct.id }, select: { id: true, name: true, status: true } }), cxaProduct); assert.equal(await database.quote.count(), quoteCount); } finally { await database.supplierProduct.delete({ where: { id: source.id } }); }
});

test("sync triggering roles are server-side and limited to catalogue staff", () => {
  assert.equal(can("ADMIN","suppliers:write"),true); assert.equal(can("CATALOGUE_MANAGER","suppliers:write"),true); assert.equal(can("QUOTE_MANAGER","suppliers:write"),false); assert.equal(can("READ_ONLY","suppliers:write"),false);
});

test("sync architecture keeps independent cursors and manual CXA publishing", async () => {
  const jobs = await readFile("src/suppliers/premium-apparel/jobs.ts","utf8"); const sync = await readFile("src/suppliers/premium-apparel/sync.ts","utf8");
  for (const resource of ["PRODUCTS","STOCK","PRICES"]) assert.match(jobs,new RegExp(`cursorFor\\(run\\.supplierId, \\"${resource}\\"`));
  assert.doesNotMatch(sync,/database\.product\.(?:create|upsert|update)/); assert.doesNotMatch(jobs,/database\.product\.(?:create|upsert|update)/);
});

test("supplier browser is bounded, searchable, filterable, and sortable", async () => {
  const page = await readFile("src/app/admin/(portal)/suppliers/[supplierId]/products/page.tsx","utf8"); assert.match(page,/const take = 25/); for(const value of ["supplierTitle","style","supplierBrand","supplierCategory","active","catalogueLinks","lastSyncedAt"]) assert.match(page,new RegExp(value));
});

test("sync job storage and logs omit confidential payload fields", async () => {
  const schema=await readFile("prisma/schema.prisma","utf8"); const jobs=await readFile("src/suppliers/premium-apparel/jobs.ts","utf8"); const runModel=schema.slice(schema.indexOf("model SupplierSyncRun"),schema.indexOf("model SupplierSyncLock")); assert.doesNotMatch(runModel,/apiKey|Authorization|supplierPrice|rawData/); assert.doesNotMatch(jobs,/console\.(?:log|info).*supplierPrice/);
});

test("migration adds scale indexes and durable run/lock history", async () => {
  const schema=await readFile("prisma/schema.prisma","utf8"); for(const value of ["model SupplierSyncRun","model SupplierSyncLock","@@index([supplierId, active])","@@index([stockUpdatedAt])","@@index([priceUpdatedAt])"]) assert.ok(schema.includes(value));
});
