import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();
const quoteNumber = process.argv[2];
if (!quoteNumber || !/^CXA-\d{4}-\d{5,}$/.test(quoteNumber)) {
  throw new Error("Usage: npm run quotes:show -- CXA-YYYY-00001");
}
const { database } = await import("../src/lib/database.ts");

try {
  const quote = await database.quote.findUniqueOrThrow({
    where: { quoteNumber },
    select: {
      businessName: true,
      customerName: true,
      quoteNumber: true,
      status: true,
      submittedAt: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          colourDescription: true,
          productNameSnapshot: true,
          totalQuantity: true,
          decorations: { select: { locationLabel: true, methodLabel: true } },
          sizes: { select: { quantity: true, size: true } },
        },
      },
    },
  });
  console.log(JSON.stringify(quote, null, 2));
} finally {
  await database.$disconnect();
}
