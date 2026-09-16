export const SUPPLIER_TYPES = ["api", "csv", "xlsx", "manual"] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export interface SupplierRequest {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
}

export interface SupplierAdapter {
  readonly id: string;
  readonly type: SupplierType;
  request(request: SupplierRequest): Promise<unknown>;
}
