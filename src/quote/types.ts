import type {
  DecorationLocation,
  DecorationMethod,
} from "./definitions.ts";

export interface QuoteDecorationSelection {
  location: DecorationLocation;
  method: DecorationMethod;
  note?: string;
  artwork?: {
    token: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    status: "UPLOADED";
  };
}

export interface QuoteLine {
  quoteLineId: string;
  productId: string;
  productSlug: string;
  productName: string;
  colourCode: string;
  colourDescription: string;
  productImage: string | null;
  sizeQuantities: Record<string, number>;
  totalGarmentQuantity: number;
  decorations: QuoteDecorationSelection[];
  customerNotes?: string;
}

export interface QuoteCart {
  version: 1;
  lines: QuoteLine[];
}

export const EMPTY_QUOTE_CART: QuoteCart = { version: 1, lines: [] };
export const QUOTE_CART_STORAGE_KEY = "cxa_quote_cart_v1";
