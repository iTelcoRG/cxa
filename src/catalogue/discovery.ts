import type { PublicProduct } from "./customer.ts";
import { matchesCatalogueRange } from "./ranges.ts";

export type ProductSort = "featured" | "newest" | "name" | "name-desc";
export interface CatalogueFilters { availability?: string; brand?: string; category?: string; range?: string; method?: string; query?: string; sort?: string; }

export function decorationLabels(product: PublicProduct): string[] {
  return [product.decorations.screenPrint && "Screen Print", product.decorations.embroidery && "Embroidery", product.decorations.dtf && "DTF"].filter(Boolean) as string[];
}

export function filterAndSortProducts(products: PublicProduct[], filters: CatalogueFilters): PublicProduct[] {
  const query = filters.query?.trim().toLocaleLowerCase("en-NZ") ?? "";
  const result = products.filter(product => {
    const searchable = [product.name, product.brand, product.category, product.description].filter(Boolean).join(" ").toLocaleLowerCase("en-NZ");
    const availabilities = product.colours.flatMap(colour => colour.variants.map(variant => variant.availability));
    return (!query || searchable.includes(query)) &&
      (!filters.range || matchesCatalogueRange(product, filters.range)) &&
      (!filters.category || product.categorySlug === filters.category || product.category === filters.category) &&
      (!filters.brand || product.brandSlug === filters.brand || product.brand === filters.brand) &&
      (!filters.method || decorationLabels(product).includes(filters.method)) &&
      (!filters.availability || availabilities.includes(filters.availability as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"));
  });
  const sort = filters.sort as ProductSort;
  return result.sort((a, b) => sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "newest" ? (b.createdAt ?? "").localeCompare(a.createdAt ?? "") : sort === "featured" ? Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
}
