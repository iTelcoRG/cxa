import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();
const { database } = await import("../src/lib/database.ts");

try {
  const quotes = await database.quote.findMany({
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      businessName: true,
      customerName: true,
      quoteNumber: true,
      status: true,
      submittedAt: true,
      lines: { select: { totalQuantity: true } },
    },
  });
  console.log(
    JSON.stringify(
      quotes.map((quote) => ({
        businessName: quote.businessName,
        configurations: quote.lines.length,
        customerName: quote.customerName,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        submittedAt: quote.submittedAt,
        totalGarments: quote.lines.reduce((total, line) => total + line.totalQuantity, 0),
      })),
      null,
      2,
    ),
  );
} finally {
  await database.$disconnect();
}
