import {
  assertSafeDevelopmentDatabase,
  loadLocalEnvironment,
} from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();
const { getPublishedProductBySlug } = await import("../src/catalogue/customer.ts");
const { submitQuoteRequest } = await import("../src/quotes/submission.ts");
const { database } = await import("../src/lib/database.ts");

try {
  const product = await getPublishedProductBySlug(
    "101cvc-american-apparel-cvc-womens-racerneck-tank",
  );
  if (!product) throw new Error("Published 101CVC CXA product was not found.");
  const black = product.colours.find(
    (colour) => colour.description.toLowerCase() === "black",
  );
  const alternate = product.colours.find((colour) => colour.code !== black?.code);
  const blackSizes = black?.variants
    .filter((variant) => variant.availability !== "OUT_OF_STOCK")
    .slice(0, 2);
  const alternateSizes = alternate?.variants
    .filter((variant) => variant.availability !== "OUT_OF_STOCK")
    .slice(0, 2);
  if (!black || !alternate || blackSizes?.length !== 2 || alternateSizes?.length !== 2) {
    throw new Error("Required development colour/size configurations are unavailable.");
  }

  const line = (
    quoteLineId: string,
    colour: typeof black,
    sizes: typeof blackSizes,
    decorations: Array<{
      location: "FRONT_LEFT_CHEST" | "BACK_FULL" | "FRONT_CENTRE" | "RIGHT_SLEEVE";
      method: "DTF" | "SCREEN_PRINT";
    }>,
  ) => ({
    quoteLineId,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    colourCode: colour.code,
    colourDescription: colour.description,
    productImage: colour.images[0] ?? product.primaryImage,
    sizeQuantities: { [sizes[0]!.size]: 2, [sizes[1]!.size]: 3 },
    totalGarmentQuantity: 5,
    decorations,
  });

  const payload = {
    customer: {
      customerName: "CXA Development Test",
      businessName: "CXA Development",
      email: "development@example.invalid",
      phone: "+64 00 000 0000",
      requiredBy: "",
      deliveryMethod: "TO_BE_CONFIRMED",
      deliveryAddress: "",
      customerNotes: "Task 7 development workflow verification",
    },
    lines: [
      line("task7-configuration-a", black, blackSizes, [
        { location: "FRONT_LEFT_CHEST", method: "DTF" },
        { location: "BACK_FULL", method: "SCREEN_PRINT" },
      ]),
      line("task7-configuration-b", alternate, alternateSizes, [
        { location: "FRONT_CENTRE", method: "DTF" },
        { location: "RIGHT_SLEEVE", method: "SCREEN_PRINT" },
      ]),
    ],
    idempotencyKey: "ca7a0000-0000-4000-8000-000000000007",
    website: "",
    startedAt: Date.now() - 2_000,
  };

  const first = await submitQuoteRequest(payload);
  const second = await submitQuoteRequest(payload);
  if (!first.ok || !second.ok) throw new Error("Development quote submission failed validation.");
  const stored = await database.quote.findUniqueOrThrow({
    where: { idempotencyKey: payload.idempotencyKey },
    select: {
      quoteNumber: true,
      lines: {
        select: {
          decorations: { select: { id: true } },
          sizes: { select: { quantity: true } },
        },
      },
    },
  });
  console.log(
    JSON.stringify({
      quoteNumber: stored.quoteNumber,
      firstDuplicate: first.duplicate,
      secondDuplicate: second.duplicate,
      quoteCountForIdempotencyKey: await database.quote.count({
        where: { idempotencyKey: payload.idempotencyKey },
      }),
      configurations: stored.lines.length,
      decorations: stored.lines.reduce((total, item) => total + item.decorations.length, 0),
      totalGarments: stored.lines.reduce(
        (total, item) =>
          total + item.sizes.reduce((lineTotal, size) => lineTotal + size.quantity, 0),
        0,
      ),
    }, null, 2),
  );
} finally {
  await database.$disconnect();
}
