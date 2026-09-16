import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");

const { database } = await import("../src/lib/database.ts");

const categories = [
  { name: "T-Shirts", slug: "t-shirts" },
  { name: "Hoodies & Sweatshirts", slug: "hoodies-sweatshirts" },
  { name: "Workwear", slug: "workwear" },
];

const brands = [
  { name: "AS Colour", slug: "as-colour" },
  { name: "Gildan", slug: "gildan" },
  { name: "American Apparel", slug: "american-apparel" },
];

await database.supplier.upsert({
  where: { slug: "premium-apparel" },
  create: {
    apiBaseUrl: process.env.PREMIUM_APPAREL_API_URL ?? null,
    connectionType: "API",
    name: "Premium Apparel",
    slug: "premium-apparel",
    status: "ACTIVE",
  },
  update: {
    apiBaseUrl: process.env.PREMIUM_APPAREL_API_URL ?? undefined,
  },
});

for (const category of categories) {
  await database.category.upsert({
    where: { slug: category.slug },
    create: category,
    update: { active: true, name: category.name },
  });
}

for (const brand of brands) {
  await database.brand.upsert({
    where: { slug: brand.slug },
    create: brand,
    update: { active: true, name: brand.name },
  });
}

await database.$disconnect();
