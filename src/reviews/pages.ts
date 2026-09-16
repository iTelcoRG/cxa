import "server-only";
import { database } from "../lib/database.ts";
import { mainReviewPages, type ReviewPage } from "./shared.ts";

export async function listReviewPages(): Promise<ReviewPage[]> {
  const select = { name: true, slug: true } as const;
  const [products, categories, brands] = await Promise.all([
    database.product.findMany({ where: { status: "PUBLISHED" }, select, orderBy: { name: "asc" } }),
    database.category.findMany({ where: { active: true }, select, orderBy: { name: "asc" } }),
    database.brand.findMany({ where: { active: true }, select, orderBy: { name: "asc" } }),
  ]);
  return [...mainReviewPages,
    ...categories.map(p => ({ path: `/categories/${p.slug}`, title: `Category: ${p.name}` })),
    ...brands.map(p => ({ path: `/brands/${p.slug}`, title: `Brand: ${p.name}` })),
    ...products.map(p => ({ path: `/products/${p.slug}`, title: `Product: ${p.name}` })),
  ];
}
