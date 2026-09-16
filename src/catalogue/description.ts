import { supplierContentToPlainText } from "./sanitize.ts";

export function resolvePublicDescription(
  cxaDescription: string | null | undefined,
  supplierText: string | null | undefined,
  supplierHtml: string | null | undefined,
): string | null {
  const description = cxaDescription?.trim() || supplierContentToPlainText(supplierText, supplierHtml);
  return description || null;
}
