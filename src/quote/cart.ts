import {
  DECORATION_LOCATIONS,
  DECORATION_METHODS,
  normalizePlainText,
} from "./validation-helpers.ts";
import {
  EMPTY_QUOTE_CART,
  type QuoteCart,
  type QuoteLine,
} from "./types.ts";

const FORBIDDEN_CART_KEYS = [
  "supplierprice",
  "rawdata",
  "suppliervariantid",
  "supplierid",
  "supplierproductid",
  "stock",
  "authorization",
  "apikey",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_CART_KEYS.includes(key.toLowerCase()) || containsForbiddenKey(nested),
  );
}

function isSafeCartImage(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "ik.imagekit.io" &&
      url.pathname.startsWith("/premiumapparel/")
    );
  } catch {
    return false;
  }
}

function isSafeStoredLine(value: unknown): value is QuoteLine {
  if (!isRecord(value) || containsForbiddenKey(value)) return false;
  const strings = [
    value.quoteLineId,
    value.productId,
    value.productSlug,
    value.productName,
    value.colourCode,
    value.colourDescription,
  ];
  if (!strings.every((item) => typeof item === "string" && item.length > 0 && item.length <= 300)) return false;
  if (!isSafeCartImage(value.productImage)) return false;
  if (!isRecord(value.sizeQuantities) || !Array.isArray(value.decorations)) return false;
  if (
    !Object.values(value.sizeQuantities).every(
      (quantity) => Number.isInteger(quantity) && Number(quantity) > 0,
    )
  ) return false;
  const total = Object.values(value.sizeQuantities).reduce<number>(
    (sum, quantity) => sum + Number(quantity),
    0,
  );
  if (value.totalGarmentQuantity !== total || total < 1) return false;
  if (
    !value.decorations.every(
      (item) =>
        isRecord(item) &&
        DECORATION_LOCATIONS.includes(item.location as never) &&
        DECORATION_METHODS.includes(item.method as never) &&
        (item.note === undefined || normalizePlainText(item.note, 200) !== null) &&
        (item.artwork === undefined || (isRecord(item.artwork) && typeof item.artwork.token === "string" && /^[0-9a-f-]{36}$/i.test(item.artwork.token) && typeof item.artwork.originalFileName === "string" && item.artwork.originalFileName.length > 0 && item.artwork.originalFileName.length <= 180 && typeof item.artwork.mimeType === "string" && Number.isInteger(item.artwork.sizeBytes) && Number(item.artwork.sizeBytes) > 0 && item.artwork.status === "UPLOADED")),
    )
  ) return false;
  if (
    new Set(value.decorations.map((item) => (item as Record<string, unknown>).location))
      .size !== value.decorations.length
  ) return false;
  if (
    value.customerNotes !== undefined &&
    normalizePlainText(value.customerNotes, 500) === null
  ) return false;
  return true;
}

export function deserializeQuoteCart(serialized: string | null): QuoteCart {
  if (!serialized) return EMPTY_QUOTE_CART;
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !Array.isArray(value.lines) ||
      !value.lines.every(isSafeStoredLine)
    ) return EMPTY_QUOTE_CART;
    return { version: 1, lines: value.lines };
  } catch {
    return EMPTY_QUOTE_CART;
  }
}

export function serializeQuoteCart(cart: QuoteCart): string {
  return JSON.stringify(cart);
}

export function addQuoteLine(cart: QuoteCart, line: QuoteLine): QuoteCart {
  return { version: 1, lines: [...cart.lines, line] };
}

export function editQuoteLine(cart: QuoteCart, line: QuoteLine): QuoteCart {
  if (!cart.lines.some((item) => item.quoteLineId === line.quoteLineId)) return cart;
  return {
    version: 1,
    lines: cart.lines.map((item) =>
      item.quoteLineId === line.quoteLineId ? line : item,
    ),
  };
}

export function removeQuoteLine(cart: QuoteCart, quoteLineId: string): QuoteCart {
  return { version: 1, lines: cart.lines.filter((item) => item.quoteLineId !== quoteLineId) };
}

export function clearQuoteCart(): QuoteCart {
  return EMPTY_QUOTE_CART;
}

export function totalGarmentQuantity(cart: QuoteCart): number {
  return cart.lines.reduce((total, line) => total + line.totalGarmentQuantity, 0);
}
