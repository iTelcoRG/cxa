export type PremiumApparelApiErrorCode =
  | "invalid_token"
  | "forbidden"
  | "not_found"
  | "duplicate_reference"
  | "conflict"
  | "validation_error"
  | "upstream_unavailable"
  | "upstream_error";

export interface PremiumApparelApiErrorResponse {
  error: PremiumApparelApiErrorCode;
  message: string;
  details?: Readonly<Record<string, unknown>>;
}

export interface PremiumApparelLegacyProductsErrorResponse {
  error: true;
  error_reason: string;
}

export interface PremiumApparelStockItem {
  sku: string;
  product_id: string;
  style: string;
  colour: string;
  colour_description?: string;
  size: string;
  stock: number;
  changed_at: string;
}

export interface PremiumApparelPriceItem {
  sku: string;
  product_id: string;
  style: string;
  colour: string;
  colour_description?: string;
  size: string;
  price: string;
  changed_at: string;
}

export interface PremiumApparelItemResponse<TItem> {
  as_of: string;
  as_of_epoch_ms: number;
  count: number;
  items: TItem[];
  removed?: unknown[];
}

export interface PremiumApparelProductSize {
  price: string;
  size: string;
  sku: string;
  stock: number;
}

export interface PremiumApparelProductColour {
  description: string;
  images?: string[];
  name: string;
  sizes?: PremiumApparelProductSize[];
}

export interface PremiumApparelProductSample {
  brand: string;
  category: string;
  colours?: PremiumApparelProductColour[];
  fabric: string;
  features: string;
  hero?: string[];
  html_description: string;
  size_chart: string;
  style: string;
  text_description?: string;
  title?: string;
}

export interface PremiumApparelProductsSinceResponse {
  as_of: string;
  as_of_epoch_ms: number;
  count: number;
  products: PremiumApparelProductSample[];
  removed_styles: unknown[];
}

export type PremiumApparelQueryValue =
  | string
  | number
  | readonly string[]
  | undefined;
