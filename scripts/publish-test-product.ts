import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();

const statusArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--status="));
const requestedStatus = statusArgument?.split("=", 2)[1]?.toUpperCase();

if (requestedStatus && !["DRAFT", "PUBLISHED"].includes(requestedStatus)) {
  throw new Error("Status must be DRAFT or PUBLISHED.");
}

const { database } = await import("../src/lib/database.ts");
const { publishSupplierProductToCXA } = await import(
  "../src/catalogue/publishing.ts"
);

try {
  const supplierProduct = await database.supplierProduct.findFirstOrThrow({
    where: {
      style: "101CVC",
      supplier: { slug: "premium-apparel" },
    },
    select: { id: true },
  });
  const result = await publishSupplierProductToCXA({
    supplierProductId: supplierProduct.id,
    status: requestedStatus as "DRAFT" | "PUBLISHED" | undefined,
  });

  console.log(
    JSON.stringify({
      created: result.created,
      product: result.product,
    }),
  );
} finally {
  await database.$disconnect();
}
