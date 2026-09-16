import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");

const { PremiumApparelClient } = await import("../src/suppliers/premium-apparel/client.ts");
const { PremiumApparelError } = await import("../src/suppliers/premium-apparel/errors.ts");
const { database } = await import("../src/lib/database.ts");

const quantities = [1, 10, 25, 50, 100] as const;
const tierTerms = /price.?break|bulk|tier|quantity.?price|volume|wholesale.?tier|customer.?price|minimum.?quantity|from.?quantity|to.?quantity|unit.?price/i;

function fieldPaths(value: unknown, prefix = "", result = new Set<string>()): string[] {
  if (!value || typeof value !== "object") return [...result];
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 3)) fieldPaths(entry, `${prefix}[]`, result);
    return [...result];
  }
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.add(path);
    fieldPaths(entry, path, result);
  }
  return [...result].sort();
}

async function publicPrice(sku: string): Promise<Record<string, unknown> | undefined> {
  const configuredUrl = process.env.PREMIUM_APPAREL_API_URL;
  if (!configuredUrl) throw new Error("PREMIUM_APPAREL_API_URL is required.");
  const base = new URL(configuredUrl);
  const url = new URL("/v1/prices", base);
  if (url.origin !== base.origin) throw new Error("Public pricing URL escaped the configured origin.");
  url.searchParams.set("sku", sku);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) return undefined;
  const body = await response.json() as { items?: Record<string, unknown>[] };
  return body.items?.[0];
}

async function main(): Promise<void> {
  if (!process.env.PREMIUM_APPAREL_API_KEY) throw new Error("PREMIUM_APPAREL_API_KEY is required.");
  const client = new PremiumApparelClient();
  const selection = { style: true, supplierCategory: true, rawData: true, variants: { where: { active: true }, take: 1, orderBy: { sku: "asc" as const }, select: { sku: true } } };
  const baseWhere = { supplier: { slug: "premium-apparel" }, active: true } as const;
  const candidates = await Promise.all([
    database.supplierProduct.findFirst({ where: { ...baseWhere, style: "101CVC" }, select: selection }),
    database.supplierProduct.findFirst({ where: { ...baseWhere, supplierCategory: "Hi-Vis" }, orderBy: { style: "asc" }, select: selection }),
    database.supplierProduct.findFirst({ where: { ...baseWhere, OR: [{ supplierCategory: { contains: "hood", mode: "insensitive" } }, { supplierCategory: { contains: "jacket", mode: "insensitive" } }] }, orderBy: { style: "asc" }, select: selection }),
  ]);
  const selected = candidates.filter((item, index, all): item is NonNullable<typeof item> => Boolean(item?.variants[0]) && all.findIndex((other) => other?.style === item?.style) === index);

  const results = [];
  for (const product of selected) {
    const sku = product.variants[0].sku;
    const baseline = await client.getPrices({ sku });
    const baselineItem = baseline.items[0];
    const quantityResults = [];
    for (const quantity of quantities) {
      try {
        const response = await client.getPrices({ sku, quantity });
        const item = response.items[0];
        quantityResults.push({ quantity, outcome: "accepted", same_unit_price_as_baseline: item?.price === baselineItem?.price, item_fields: item ? Object.keys(item).sort() : [] });
      } catch (cause) {
        quantityResults.push({ quantity, outcome: "rejected", status: cause instanceof PremiumApparelError ? cause.status : undefined, code: cause instanceof PremiumApparelError ? cause.code : "unknown_error" });
      }
    }
    const publicItem = await publicPrice(sku);
    const productFields = fieldPaths(product.rawData);
    results.push({
      sku,
      style: product.style,
      category: product.supplierCategory,
      authenticated_price_present: typeof baselineItem?.price === "string",
      authenticated_differs_from_default: typeof publicItem?.price === "string" && publicItem.price !== baselineItem?.price,
      authenticated_price_fields: baselineItem ? Object.keys(baselineItem).sort() : [],
      default_price_fields: publicItem ? Object.keys(publicItem).sort() : [],
      quantity_results: quantityResults,
      product_tier_field_paths: productFields.filter((path) => tierTerms.test(path)),
      product_field_path_count: productFields.length,
    });
  }
  console.log(JSON.stringify({
    title: "Premium Apparel bulk-pricing discovery",
    authenticated: true,
    read_only: true,
    numeric_prices_redacted: true,
    tested_parameter: "quantity",
    tested_quantities: quantities,
    products: results,
  }, null, 2));
}

try { await main(); }
catch (cause) {
  console.error(JSON.stringify({ code: cause instanceof PremiumApparelError ? cause.code : "discovery_error", message: "Bulk-pricing discovery failed safely." }));
  process.exitCode = 1;
} finally { await database.$disconnect(); }
