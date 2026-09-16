import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
const expected = assertSafeDevelopmentDatabase();
const { database } = await import("../src/lib/database.ts");

try {
  const [identity] = await database.$queryRaw<Array<{ database_name: string }>>`
    SELECT current_database() AS database_name
  `;

  if (identity?.database_name !== expected.databaseName) {
    throw new Error("Connected database identity did not pass the safety check.");
  }

  const [
    suppliers,
    supplierProducts,
    supplierVariants,
    products,
    publishedProducts,
    draftProducts,
    productSupplierLinks,
    quotes,
    submittedQuotes,
    quoteLines,
    quoteDecorations,
    brands,
    categories,
    syncStates,
  ] = await Promise.all([
    database.supplier.count(),
    database.supplierProduct.count(),
    database.supplierVariant.count(),
    database.product.count(),
    database.product.count({ where: { status: "PUBLISHED" } }),
    database.product.count({ where: { status: "DRAFT" } }),
    database.productSupplier.count(),
    database.quote.count(),
    database.quote.count({ where: { status: "SUBMITTED" } }),
    database.quoteLine.count(),
    database.quoteDecoration.count(),
    database.brand.count(),
    database.category.count(),
    database.supplierSyncState.findMany({
      where: { supplier: { slug: "premium-apparel" } },
      orderBy: { resource: "asc" },
      select: {
        errorSummary: true,
        lastAttemptedAt: true,
        lastSuccessfulCursor: true,
        resource: true,
        status: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        connected: true,
        database: identity.database_name,
        host: expected.host,
        counts: {
          brands,
          categories,
          cxaProducts: products,
          draftCxaProducts: draftProducts,
          productSupplierLinks,
          quoteDecorations,
          quoteLines,
          quotes,
          submittedQuotes,
          publishedCxaProducts: publishedProducts,
          supplierProducts,
          suppliers,
          supplierVariants,
        },
        premiumApparelSyncStates: syncStates,
      },
      null,
      2,
    ),
  );
} finally {
  await database.$disconnect();
}
