export type PublicAvailability =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

export function toPublicAvailability(stock: number): PublicAvailability {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= 10) return "LOW_STOCK";
  return "IN_STOCK";
}
