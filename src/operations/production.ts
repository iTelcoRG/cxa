import "server-only";

import { database } from "../lib/database.ts";

async function nextNumber(kind: "job" | "draft", year = new Date().getFullYear()) {
  return database.$transaction(async (tx) => {
    const counter = kind === "job"
      ? await tx.productionJobNumberCounter.upsert({ where: { year }, create: { year, nextValue: 2 }, update: { nextValue: { increment: 1 } } })
      : await tx.purchaseDraftNumberCounter.upsert({ where: { year }, create: { year, nextValue: 2 }, update: { nextValue: { increment: 1 } } });
    const value = counter.nextValue - 1;
    return `${kind === "job" ? "JOB" : "PO-DRAFT"}-${year}-${String(value).padStart(5, "0")}`;
  });
}

export async function createProductionJob(quoteId: string, staffUserId: string) {
  const existing = await database.productionJob.findUnique({ where: { quoteId } });
  if (existing) return existing;
  const quote = await database.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { lines: { include: { decorations: { include: { artworkProofs: { where: { status: "APPROVED" }, orderBy: { version: "desc" }, take: 1 }, artworkFiles: { where: { status: "APPROVED" }, take: 1 } } } } } } });
  const jobNumber = await nextNumber("job");
  return database.$transaction(async (tx) => {
    const job = await tx.productionJob.create({ data: { jobNumber, quoteId, createdById: staffUserId, requiredBy: quote.requiredBy, items: { create: quote.lines.map((line) => ({ quoteLineId: line.id, productNameSnapshot: line.productNameSnapshot, colourSnapshot: line.colourDescription, quantity: line.totalQuantity, sortOrder: line.sortOrder, tasks: { create: line.decorations.map((decoration) => ({ decorationId: decoration.id, locationSnapshot: decoration.locationLabel, methodSnapshot: decoration.methodLabel, approvedProofId: decoration.artworkProofs[0]?.id, approvedArtworkFileId: decoration.artworkFiles[0]?.id })) } })) } } });
    await tx.adminAuditLog.create({ data: { staffUserId, action: "PRODUCTION_JOB_CREATED", entityType: "ProductionJob", entityId: job.id, summary: `${jobNumber} created from ${quote.quoteNumber}` } });
    return job;
  });
}

export async function resolveSupplierRequirements(quoteId: string, staffUserId: string) {
  const quote = await database.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { lines: { include: { sizes: true, product: { include: { supplierLinks: { orderBy: { preferredSupplier: "desc" }, include: { supplierProduct: { include: { colours: { include: { variants: true } } } } } } } } } } } });
  await database.$transaction(async (tx) => {
    for (const line of quote.lines) for (const size of line.sizes) {
      const link = line.product?.supplierLinks[0];
      const colour = link?.supplierProduct.colours.find((c) => c.colourCode.toLowerCase() === line.colourCode.toLowerCase() || c.colourDescription.toLowerCase() === line.colourDescription.toLowerCase());
      const variant = colour?.variants.find((v) => v.size.toLowerCase() === size.size.toLowerCase() && v.active);
      await tx.supplierRequirement.upsert({ where: { quoteLineId_size: { quoteLineId: line.id, size: size.size } }, create: { quoteId, quoteLineId: line.id, size: size.size, quantity: size.quantity, supplierId: link?.supplierProduct.supplierId, supplierProductId: link?.supplierProduct.id, supplierVariantId: variant?.id, supplierSkuSnapshot: variant?.sku, stockSnapshot: variant?.stock, reviewReason: variant ? null : "No exact current supplier colour/size match; staff review required." }, update: { quantity: size.quantity, supplierId: link?.supplierProduct.supplierId, supplierProductId: link?.supplierProduct.id, supplierVariantId: variant?.id, supplierSkuSnapshot: variant?.sku, stockSnapshot: variant?.stock, reviewReason: variant ? null : "No exact current supplier colour/size match; staff review required." } });
    }
    await tx.adminAuditLog.create({ data: { staffUserId, action: "SUPPLIER_REQUIREMENTS_CREATED", entityType: "Quote", entityId: quoteId, summary: `Supplier requirements resolved for ${quote.quoteNumber}` } });
  });
}

export async function createPurchaseDrafts(quoteId: string, staffUserId: string) {
  const requirements = await database.supplierRequirement.findMany({ where: { quoteId, supplierId: { not: null }, supplierVariantId: { not: null } } });
  const supplierIds = [...new Set(requirements.map((r) => r.supplierId!))];
  const results = [];
  for (const supplierId of supplierIds) {
    const existing = await database.supplierPurchaseDraft.findUnique({ where: { quoteId_supplierId: { quoteId, supplierId } } });
    if (existing) { results.push(existing); continue; }
    const draftNumber = await nextNumber("draft");
    const selected = requirements.filter((r) => r.supplierId === supplierId);
    const draft = await database.supplierPurchaseDraft.create({ data: { draftNumber, quoteId, supplierId, createdById: staffUserId, items: { create: selected.map((r) => ({ supplierRequirementId: r.id, skuSnapshot: r.supplierSkuSnapshot!, sizeSnapshot: r.size, quantity: r.quantity })) } } });
    await database.adminAuditLog.create({ data: { staffUserId, action: "PURCHASE_DRAFT_CREATED", entityType: "SupplierPurchaseDraft", entityId: draft.id, summary: `${draftNumber} created as an internal draft only` } });
    results.push(draft);
  }
  return results;
}
