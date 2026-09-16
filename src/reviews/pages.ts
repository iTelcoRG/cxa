import "server-only";
import { database } from "../lib/database.ts";
import { mainReviewPages, type ReviewPage } from "./shared.ts";

export async function listReviewPages(): Promise<ReviewPage[]> {
  const select = { name: true, slug: true } as const;
  const products = await database.product.findMany({ where: { status: "PUBLISHED" }, select, orderBy: { name: "asc" } });
  return [...mainReviewPages,
    ...products.map(p => ({ path: `/products/${p.slug}`, title: `Product: ${p.name}` })),
  ];
}
