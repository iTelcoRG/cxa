import type { PublicProduct } from "../catalogue/customer.ts";
import {
  CUSTOMER_NOTE_MAX_LENGTH,
  DECORATION_LOCATIONS,
  DECORATION_METHODS,
  LOCATION_NOTE_MAX_LENGTH,
  type DecorationMethod,
} from "./definitions.ts";
import type { QuoteLine } from "./types.ts";
import { normalizePlainText } from "./validation-helpers.ts";

export interface QuoteValidationResult {
  valid: boolean;
  errors: string[];
  line?: QuoteLine;
}

function methodIsEnabled(product: PublicProduct, method: DecorationMethod): boolean {
  const definition = DECORATION_METHODS.find((item) => item.code === method);
  return definition ? product.decorations[definition.productKey] : false;
}

export function validateQuoteLineAgainstProduct(
  candidate: QuoteLine,
  product: PublicProduct,
): QuoteValidationResult {
  const errors: string[] = [];
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(candidate.quoteLineId)) {
    errors.push("The quote line identifier is invalid.");
  }
  if (candidate.productId !== product.id || candidate.productSlug !== product.slug) {
    errors.push("The selected product is no longer valid.");
  }

  const colour = product.colours.find((item) => item.code === candidate.colourCode);
  if (!colour || colour.description !== candidate.colourDescription) {
    errors.push("Select a valid product colour.");
  }

  let total = 0;
  const cleanedQuantities: Record<string, number> = {};
  for (const [size, quantity] of Object.entries(candidate.sizeQuantities)) {
    const variant = colour?.variants.find((item) => item.size === size);
    if (!variant) {
      errors.push(`Size ${size} is not available for this colour.`);
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.push(`Quantity for ${size} must be a whole number of zero or more.`);
      continue;
    }
    if (quantity > 0 && variant.availability === "OUT_OF_STOCK") {
      errors.push(
        `The selected ${size} size in ${colour?.description ?? "this colour"} is no longer available. Please update your quote.`,
      );
      continue;
    }
    if (quantity > 0) {
      cleanedQuantities[size] = quantity;
      total += quantity;
    }
  }
  if (total < 1) errors.push("Enter a quantity for at least one size.");

  const seenLocations = new Set<string>();
  const cleanedDecorations = candidate.decorations.map((selection) => {
    if (!DECORATION_LOCATIONS.some((item) => item.code === selection.location)) {
      errors.push("A decoration location is not recognized.");
    }
    if (seenLocations.has(selection.location)) {
      errors.push("Each decoration location can only be selected once.");
    }
    seenLocations.add(selection.location);
    if (!DECORATION_METHODS.some((item) => item.code === selection.method)) {
      errors.push("A decoration method is not recognized.");
    } else if (!methodIsEnabled(product, selection.method)) {
      errors.push("A selected decoration method is not enabled for this product.");
    }
    const note = normalizePlainText(selection.note ?? "", LOCATION_NOTE_MAX_LENGTH);
    if (note === null) errors.push("Decoration notes must be plain text and 200 characters or fewer.");
    return { ...selection, ...(note ? { note } : { note: undefined }) };
  });
  if (cleanedDecorations.length < 1) errors.push("Select at least one branding location.");

  const customerNotes = normalizePlainText(
    candidate.customerNotes ?? "",
    CUSTOMER_NOTE_MAX_LENGTH,
  );
  if (customerNotes === null) {
    errors.push("Customer notes must be plain text and 500 characters or fewer.");
  }

  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    line: {
      ...candidate,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      colourCode: colour?.code ?? candidate.colourCode,
      colourDescription: colour?.description ?? candidate.colourDescription,
      customerNotes: customerNotes || undefined,
      decorations: cleanedDecorations,
      productImage: colour?.images[0] ?? product.primaryImage,
      sizeQuantities: cleanedQuantities,
      totalGarmentQuantity: total,
    },
  };
}
