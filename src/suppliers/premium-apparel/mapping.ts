import type {
  PremiumApparelPriceItem,
  PremiumApparelProductSample,
  PremiumApparelStockItem,
} from "./types.ts";

export interface MappedSupplierImage {
  colourCode: string | null;
  kind: "HERO" | "COLOUR";
  sortOrder: number;
  url: string;
}

export interface MappedSupplierVariant {
  colourCode: string;
  size: string;
  sku: string;
  stock: number;
  supplierPrice: string | null;
  supplierVariantId: null;
}

export interface MappedSupplierProduct {
  active: true;
  fabric: string | null;
  features: string | null;
  htmlDescription: string | null;
  images: MappedSupplierImage[];
  rawData: PremiumApparelProductSample;
  sizeChart: string | null;
  style: string;
  supplierBrand: string;
  supplierCategory: string;
  supplierProductKey: string;
  supplierTitle: string;
  textDescription: string | null;
  variants: MappedSupplierVariant[];
  colours: Array<{
    colourCode: string;
    colourDescription: string;
  }>;
}

export function deduplicateImageUrls(urls: readonly string[]): string[] {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

export function toDecimalPrice(price: string): string {
  const trimmed = price.trim();

  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    throw new Error("Supplier price must be a non-negative decimal string.");
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "");
  const fraction = fractionalPart.replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

function toOptionalDecimalPrice(price: unknown): string | null {
  if (typeof price !== "string") return null;
  try {
    return toDecimalPrice(price);
  } catch {
    // The dedicated authenticated prices feed remains the source of truth.
    return null;
  }
}

export function mapPremiumApparelProduct(
  product: PremiumApparelProductSample,
): MappedSupplierProduct {
  const style = product.style.trim();
  if (!style) throw new Error("Supplier product style is required.");
  const colours = product.colours ?? [];
  const heroImages = deduplicateImageUrls(product.hero ?? []).map((url, sortOrder) => ({
    colourCode: null,
    kind: "HERO" as const,
    sortOrder,
    url,
  }));

  const colourImages = colours.flatMap((colour) =>
    deduplicateImageUrls(colour.images ?? []).map((url, sortOrder) => ({
      colourCode: colour.name.trim(),
      kind: "COLOUR" as const,
      sortOrder,
      url,
    })),
  );

  return {
    active: true,
    colours: colours.map((colour) => ({
      colourCode: colour.name.trim(),
      colourDescription: colour.description.trim(),
    })),
    fabric: product.fabric || null,
    features: product.features || null,
    htmlDescription: product.html_description || null,
    images: deduplicateMappedImages([...heroImages, ...colourImages]),
    rawData: product,
    sizeChart: product.size_chart || null,
    style,
    supplierBrand: product.brand.trim(),
    supplierCategory: product.category.trim(),
    supplierProductKey: style,
    supplierTitle: product.title?.trim() || style,
    textDescription: product.text_description || null,
    variants: colours.flatMap((colour) =>
      (colour.sizes ?? []).map((variant) => ({
        colourCode: colour.name.trim(),
        size: variant.size,
        sku: variant.sku.trim(),
        stock: variant.stock,
        supplierPrice: toOptionalDecimalPrice(variant.price),
        supplierVariantId: null,
      })),
    ),
  };
}

function deduplicateMappedImages(
  images: readonly MappedSupplierImage[],
): MappedSupplierImage[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

export function mapPremiumApparelStock(item: PremiumApparelStockItem) {
  return {
    changedAt: new Date(item.changed_at),
    colourCode: item.colour,
    colourDescription: item.colour_description ?? item.colour,
    productId: item.product_id,
    size: item.size,
    sku: item.sku,
    stock: item.stock,
    style: item.style,
  };
}

export function mapPremiumApparelPrice(item: PremiumApparelPriceItem) {
  return {
    changedAt: new Date(item.changed_at),
    colourCode: item.colour,
    colourDescription: item.colour_description ?? item.colour,
    productId: item.product_id,
    size: item.size,
    sku: item.sku,
    style: item.style,
    supplierPrice: toOptionalDecimalPrice(item.price),
  };
}

export function extractRemovedStyles(removed: readonly unknown[]): string[] {
  return deduplicateStrings(
    removed.flatMap((entry) => {
      if (typeof entry === "string") return [entry];
      if (isRecord(entry) && typeof entry.style === "string") return [entry.style];
      return [];
    }),
  );
}

export function extractRemovedSkus(removed: readonly unknown[]): string[] {
  return deduplicateStrings(
    removed.flatMap((entry) => {
      if (typeof entry === "string") return [entry];
      if (isRecord(entry) && typeof entry.sku === "string") return [entry.sku];
      return [];
    }),
  );
}

function deduplicateStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
