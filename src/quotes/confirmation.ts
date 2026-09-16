import "server-only";

import { database } from "../lib/database.ts";
import type { SafeConfirmation } from "./types.ts";

export async function getSafeQuoteConfirmation(
  quoteNumber: string,
  token: string,
): Promise<SafeConfirmation | null> {
  if (!/^CXA-\d{4}-\d{5,}$/.test(quoteNumber) || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return null;
  }
  const quote = await database.quote.findFirst({
    where: { quoteNumber, confirmationToken: token },
    select: {
      customerName: true,
      quoteNumber: true,
      submittedAt: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          colourDescription: true,
          productNameSnapshot: true,
          totalQuantity: true,
        },
      },
      artworkFiles: { where: { status: { not: "DELETED" } }, orderBy: { uploadedAt: "asc" }, select: { originalFileName: true } },
    },
  });
  if (!quote) return null;
  return {
    quoteNumber: quote.quoteNumber,
    customerName: quote.customerName,
    submittedAt: quote.submittedAt.toISOString(),
    configurationCount: quote.lines.length,
    totalGarments: quote.lines.reduce((total, line) => total + line.totalQuantity, 0),
    products: quote.lines.map((line) => ({
      productName: line.productNameSnapshot,
      colourDescription: line.colourDescription,
      totalQuantity: line.totalQuantity,
    })),
    artwork: quote.artworkFiles,
  };
}
