import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");

const { PremiumApparelError } = await import(
  "../src/suppliers/premium-apparel/errors.ts"
);
const { PremiumApparelClient } = await import(
  "../src/suppliers/premium-apparel/client.ts"
);

const SAMPLE_LIMIT = 3;
const DISCOVERY_STYLE = "101CVC";

function requireConfiguration(): void {
  if (
    !process.env.PREMIUM_APPAREL_API_URL ||
    !process.env.PREMIUM_APPAREL_API_KEY
  ) {
    throw new PremiumApparelError(
      "Create .env.local and configure both Premium Apparel variables.",
      { code: "configuration_error" },
    );
  }
}

function justBefore(timestamp: string): string {
  const milliseconds = Date.parse(timestamp);
  if (Number.isNaN(milliseconds)) return timestamp;
  return new Date(milliseconds - 1).toISOString();
}

function sanitizeProduct(
  product: import("../src/suppliers/premium-apparel/types.ts").PremiumApparelProductSample,
) {
  return {
    fields: Object.keys(product),
    brand: product.brand,
    category: product.category,
    style: product.style,
    title: product.title,
    fabric: product.fabric,
    hero: (product.hero ?? []).slice(0, 2),
    colours: (product.colours ?? []).slice(0, 2).map((colour) => ({
      description: colour.description,
      images: (colour.images ?? []).slice(0, 2),
      name: colour.name,
      sizes: (colour.sizes ?? []).slice(0, SAMPLE_LIMIT),
      total_sizes: (colour.sizes ?? []).length,
    })),
    total_colours: (product.colours ?? []).length,
    content_present: {
      features: Boolean(product.features),
      html_description: Boolean(product.html_description),
      size_chart: Boolean(product.size_chart),
      text_description: Boolean(product.text_description),
    },
  };
}

async function discover(): Promise<void> {
  requireConfiguration();
  const client = new PremiumApparelClient();

  const stock = await client.getStock({ style: DISCOVERY_STYLE });
  const firstStockItem = stock.items[0];

  if (!firstStockItem) {
    throw new PremiumApparelError(
      `No stock records were returned for discovery style ${DISCOVERY_STYLE}.`,
      { code: "invalid_response" },
    );
  }

  const prices = await client.getPrices({ sku: firstStockItem.sku });
  const since = justBefore(firstStockItem.changed_at);
  const products = await client.getProductsSince(since);

  console.log(
    JSON.stringify(
      {
        authenticated: true,
        development_only: true,
        endpoints: {
          prices: { path: "/v1/prices", query: { sku: firstStockItem.sku } },
          products: { path: "/v1/products", query: { since } },
          stock: { path: "/v1/stock", query: { style: DISCOVERY_STYLE } },
        },
        samples: {
          prices: prices.items.slice(0, SAMPLE_LIMIT),
          products: products.products.slice(0, 1).map(sanitizeProduct),
          stock: stock.items.slice(0, SAMPLE_LIMIT),
        },
        totals: {
          prices: prices.count,
          products: products.count,
          stock: stock.count,
        },
      },
      null,
      2,
    ),
  );
}

try {
  await discover();
} catch (cause) {
  if (cause instanceof PremiumApparelError) {
    console.error(
      JSON.stringify({
        code: cause.code,
        message: cause.message,
        status: cause.status,
      }),
    );
  } else {
    console.error(
      JSON.stringify({ code: "unknown_error", message: "Discovery failed." }),
    );
  }
  process.exitCode = 1;
}
