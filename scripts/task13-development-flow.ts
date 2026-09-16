import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";
loadLocalEnvironment();
assertSafeDevelopmentDatabase();
const { artworkStorage } = await import("../src/artwork/storage.ts");
const { database } = await import("../src/lib/database.ts");
const { createArtworkProof, readyProofForCustomer, respondToProof } = await import("../src/operations/proofs.ts");
const { createProductionJob, createPurchaseDrafts, resolveSupplierRequirements } = await import("../src/operations/production.ts");
const { transitionWorkflow } = await import("../src/operations/workflow.ts");

const quoteNumber = "CXA-2026-00062";
const quote = await database.quote.findUniqueOrThrow({ where: { quoteNumber }, include: { lines: { include: { decorations: { include: { artworkFiles: true, artworkProofs: true } } } }, artworkFiles: true } });
const staff = await database.staffUser.findFirstOrThrow({ where: { active: true, role: "ADMIN" } });
await database.artworkFile.updateMany({ where: { quoteId: quote.id, status: { in: ["UPLOADED", "REJECTED"] } }, data: { status: "APPROVED", rejectionReason: null } });

async function move(stage: Parameters<typeof transitionWorkflow>[1]) {
  const current = await database.quote.findUniqueOrThrow({ where: { id: quote.id }, select: { workflowStage: true } });
  if (current.workflowStage !== stage) await transitionWorkflow(quote.id, stage, staff.id, "Task 13 controlled development workflow.");
}

await move("ARTWORK_REVIEW");
await move("PROOF_PREPARATION");
for (const line of quote.lines) for (const decoration of line.decorations) {
  let proof = await database.artworkProof.findFirst({ where: { decorationId: decoration.id, status: { not: "SUPERSEDED" } }, orderBy: { version: "desc" } });
  if (!proof) {
    const artwork = decoration.artworkFiles[0];
    if (!artwork) throw new Error(`No artwork fixture for ${decoration.locationLabel}.`);
    const bytes = await artworkStorage.readBytes(artwork.storageKey);
    proof = await createArtworkProof({ quoteId: quote.id, quoteLineId: line.id, decorationId: decoration.id, sourceArtworkFileId: artwork.id, file: new File([Uint8Array.from(bytes).buffer], `proof-${decoration.location.toLowerCase()}.${artwork.extension}`, { type: artwork.mimeType }), staffUserId: staff.id, note: "Task 13 development proof." });
  }
  if (proof.status !== "APPROVED") {
    const approval = await readyProofForCustomer(proof.id, staff.id, 1);
    if (!await respondToProof(approval.token, "APPROVED", "Approved in controlled Task 13 development flow.")) throw new Error("Proof approval failed.");
  }
}
await move("AWAITING_CUSTOMER_APPROVAL");
await move("PRODUCTION_PLANNING");
await createProductionJob(quote.id, staff.id);
await move("SUPPLIER_ORDER_PREPARATION");
await resolveSupplierRequirements(quote.id, staff.id);
await database.supplierRequirement.updateMany({ where: { quoteId: quote.id, supplierVariantId: { not: null } }, data: { status: "READY_TO_ORDER" } });
const unresolved = await database.supplierRequirement.count({ where: { quoteId: quote.id, supplierVariantId: null } });
if (unresolved) await database.quote.update({ where: { id: quote.id }, data: { supplierRequirementWaivedAt: new Date(), supplierRequirementWaivedById: staff.id, supplierRequirementWaiverReason: `${unresolved} unresolved supplier requirement(s) explicitly waived for Task 13 development verification.` } });
await createPurchaseDrafts(quote.id, staff.id);
await move("READY_FOR_PRODUCTION");
await database.productionJob.update({ where: { quoteId: quote.id }, data: { status: "IN_PROGRESS", items: { updateMany: { where: {}, data: { status: "IN_PROGRESS" } } } } });
await database.productionDecorationTask.updateMany({ where: { productionJobItem: { productionJob: { quoteId: quote.id } } }, data: { status: "IN_PROGRESS" } });
await move("IN_PRODUCTION");
await database.productionDecorationTask.updateMany({ where: { productionJobItem: { productionJob: { quoteId: quote.id } } }, data: { status: "COMPLETED" } });
await database.productionJob.update({ where: { quoteId: quote.id }, data: { status: "COMPLETED", items: { updateMany: { where: {}, data: { status: "COMPLETED" } } } } });
await move("READY");
await move("COMPLETED");

const result = await database.quote.findUniqueOrThrow({ where: { id: quote.id }, include: { workflowEvents: true, artworkProofs: true, productionJob: { include: { items: { include: { tasks: true } } } }, supplierRequirements: true, purchaseDrafts: { include: { items: true } } } });
console.log(JSON.stringify({ quoteNumber: result.quoteNumber, workflowStage: result.workflowStage, commercialStatus: result.status, workflowEvents: result.workflowEvents.length, proofs: result.artworkProofs.map((p) => ({ version: p.version, status: p.status })), productionJob: result.productionJob && { jobNumber: result.productionJob.jobNumber, status: result.productionJob.status, items: result.productionJob.items.length, tasks: result.productionJob.items.reduce((sum, item) => sum + item.tasks.length, 0) }, supplierRequirements: result.supplierRequirements.length, unresolvedSupplierRequirements: result.supplierRequirements.filter((r) => !r.supplierVariantId).length, purchaseDrafts: result.purchaseDrafts.map((d) => ({ draftNumber: d.draftNumber, status: d.status, items: d.items.length })) }, null, 2));
await database.$disconnect();
