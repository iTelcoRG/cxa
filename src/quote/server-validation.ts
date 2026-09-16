import "server-only";

import { getPublishedProductBySlug } from "../catalogue/customer.ts";
import { deserializeQuoteCart } from "./cart.ts";
import type { QuoteLine } from "./types.ts";
import {
  validateQuoteLineAgainstProduct,
  type QuoteValidationResult,
} from "./validation.ts";

export interface ServerValidatedQuoteLine {
  result: QuoteValidationResult;
  product: Awaited<ReturnType<typeof getPublishedProductBySlug>>;
}

export async function revalidateQuoteLineForSubmission(
  candidate: unknown,
): Promise<ServerValidatedQuoteLine> {
  let parsed: QuoteLine | undefined;
  try {
    parsed = deserializeQuoteCart(
      JSON.stringify({ version: 1, lines: [candidate] }),
    ).lines[0];
  } catch {
    parsed = undefined;
  }
  if (!parsed) {
    return {
      product: null,
      result: { valid: false, errors: ["The quote line payload is malformed."] },
    };
  }
  const product = await getPublishedProductBySlug(parsed.productSlug);
  if (!product) {
    return {
      product: null,
      result: {
        valid: false,
        errors: ["The product is not published or no longer exists."],
      },
    };
  }
  return { product, result: validateQuoteLineAgainstProduct(parsed, product) };
}

export async function validateQuoteLineServer(
  candidate: unknown,
): Promise<QuoteValidationResult> {
  return (await revalidateQuoteLineForSubmission(candidate)).result;
}
