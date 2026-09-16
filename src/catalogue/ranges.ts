// Customer-facing ranges are independent of supplier taxonomy and photography.
export const catalogueRanges = [
  { slug: "t-shirts", name: "T-Shirts", categories: ["t-shirt", "t-shirts"], pattern: /\b(?:t[ -]?shirts?|tees?)\b/i, exclude: /\bpolo\b/i },
  { slug: "polos", name: "Polos", categories: ["polo", "polos"], pattern: /\bpolo\b/i },
  { slug: "singlets", name: "Singlets", categories: ["singlet", "singlets", "tank", "tanks"], pattern: /\b(?:singlets?|tanks?)\b/i },
  { slug: "longsleeve", name: "Longsleeve", categories: ["longsleeve"], pattern: /\blong[ -]?sleeve\b/i },
  { slug: "sweatshirts-hoodies", name: "Sweatshirts / Hoodies", categories: ["sweatshirts-hoodies", "hoodies"], pattern: /\b(?:hoodies?|hooded|sweatshirts?)\b/i },
  { slug: "outerwear", name: "Outerwear", categories: ["outerwear", "soft-shell"], pattern: /\b(?:jackets?|soft[ -]?shell|windbreakers?|parkas?|coats?)\b/i },
  { slug: "fleece", name: "Fleece", categories: ["fleece"], pattern: /\bfleece\b/i, exclude: /\b(?:beanies?|hats?|caps?|scarves|gloves|blankets?)\b/i },
  { slug: "pants-shorts", name: "Pants / Shorts", categories: ["pants-shorts", "bottoms"], pattern: /\b(?:pants|shorts|trousers|leggings|tights|sweatpants|joggers)\b/i },
  { slug: "hi-vis", name: "Hi-Vis", categories: ["hi-vis"], pattern: /\b(?:hi[ -]?vis|high[ -]visibility|ttmc)\b/i },
  { slug: "headwear", name: "Headwear", categories: ["headwear"], pattern: /\b(?:caps?|hats?|beanies?|visors?|bucket hat)\b/i },
  { slug: "accessories", name: "Accessories", categories: ["accessories", "luggage"], pattern: /\b(?:bags?|backpacks?|totes?|scarves|scarfs|socks|towels|aprons|gloves)\b/i },
] as const;

export function getCatalogueRange(slug?: string) {
  return catalogueRanges.find(range => range.slug === slug);
}

export function matchesCatalogueRange(product: { name: string; categorySlug?: string | null }, slug: string): boolean {
  const range = getCatalogueRange(slug);
  if (!range) return false;
  // Supplier service lines are not garments (e.g. "Hoodie Neck Relabel").
  if (/\b(?:relabel|relabelling|lining change|setup charge|set-up charge)\b/i.test(product.name)) return false;
  if ("exclude" in range && range.exclude.test(product.name)) return false;
  return (range.categories as readonly string[]).includes(product.categorySlug ?? "") || range.pattern.test(product.name);
}
