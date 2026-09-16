import "server-only";

import type { QuoteWorkflowStage } from "../generated/prisma/client.ts";
import { database } from "../lib/database.ts";

export const workflowTransitions: Record<QuoteWorkflowStage, readonly QuoteWorkflowStage[]> = {
  QUOTE_SUBMITTED: ["ARTWORK_REVIEW", "CANCELLED"],
  ARTWORK_REVIEW: ["PROOF_PREPARATION", "CANCELLED"],
  PROOF_PREPARATION: ["AWAITING_CUSTOMER_APPROVAL", "ARTWORK_REVIEW", "CANCELLED"],
  AWAITING_CUSTOMER_APPROVAL: ["PRODUCTION_PLANNING", "PROOF_PREPARATION", "CANCELLED"],
  PRODUCTION_PLANNING: ["SUPPLIER_ORDER_PREPARATION", "CANCELLED"],
  SUPPLIER_ORDER_PREPARATION: ["READY_FOR_PRODUCTION", "CANCELLED"],
  READY_FOR_PRODUCTION: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class WorkflowGateError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(reasons.join(" "));
    this.reasons = reasons;
    this.name = "WorkflowGateError";
  }
}

export async function workflowGateReasons(quoteId: string, next: QuoteWorkflowStage): Promise<string[]> {
  const quote = await database.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      artworkFiles: { where: { status: { notIn: ["ARCHIVED", "DELETED"] } } },
      artworkProofs: { where: { status: { not: "SUPERSEDED" } } },
      revisionRequests: { where: { status: "OPEN" } },
      productionJob: true,
      supplierRequirements: true,
    },
  });
  const reasons: string[] = [];
  if (next === "PROOF_PREPARATION") {
    if (quote.revisionRequests.length) reasons.push("Resolve all open artwork revision requests first.");
    if (quote.artworkFiles.length && quote.artworkFiles.some((file) => file.status !== "APPROVED")) reasons.push("All active artwork must be approved.");
    if (!quote.artworkFiles.length && !quote.artworkNoFileConfirmedAt) reasons.push("Confirm that no artwork file is required.");
  }
  if (next === "AWAITING_CUSTOMER_APPROVAL" && !quote.artworkProofs.some((proof) => proof.status === "READY_FOR_CUSTOMER" || proof.status === "APPROVED")) reasons.push("At least one proof must be ready for the customer.");
  if (next === "PRODUCTION_PLANNING") {
    if (!quote.artworkProofs.length || quote.artworkProofs.some((proof) => proof.status !== "APPROVED")) reasons.push("Every current proof must be customer-approved.");
  }
  if (next === "SUPPLIER_ORDER_PREPARATION" && !quote.productionJob) reasons.push("Create the production job first.");
  if (["READY_FOR_PRODUCTION", "IN_PRODUCTION"].includes(next)) {
    if (!quote.productionJob) reasons.push("A production job is required.");
    if (!quote.supplierRequirementWaivedAt && (!quote.supplierRequirements.length || quote.supplierRequirements.some((r) => !["READY_TO_ORDER", "ORDERED", "RECEIVED", "CANCELLED"].includes(r.status)))) reasons.push("Supplier requirements must be ready to order, or explicitly waived.");
  }
  if (next === "READY" && quote.productionJob?.status !== "COMPLETED") reasons.push("The production job must be completed first.");
  return reasons;
}

export async function transitionWorkflow(quoteId: string, next: QuoteWorkflowStage, staffUserId: string | null, note?: string) {
  const quote = await database.quote.findUniqueOrThrow({ where: { id: quoteId }, select: { workflowStage: true, quoteNumber: true } });
  if (!workflowTransitions[quote.workflowStage].includes(next)) throw new WorkflowGateError([`Transition from ${quote.workflowStage} to ${next} is not allowed.`]);
  const reasons = await workflowGateReasons(quoteId, next);
  if (reasons.length) throw new WorkflowGateError(reasons);
  const commercialStatus = next === "IN_PRODUCTION" ? "IN_PRODUCTION" : next === "READY" ? "READY" : next === "COMPLETED" ? "COMPLETED" : next === "CANCELLED" ? "CANCELLED" : undefined;
  return database.$transaction(async (tx) => {
    const updated = await tx.quote.update({ where: { id: quoteId, workflowStage: quote.workflowStage }, data: { workflowStage: next, ...(commercialStatus ? { status: commercialStatus } : {}) } });
    await tx.quoteWorkflowEvent.create({ data: { quoteId, previousStage: quote.workflowStage, newStage: next, staffUserId, note: note?.slice(0, 1000) || null } });
    if (staffUserId) await tx.adminAuditLog.create({ data: { staffUserId, action: "WORKFLOW_STAGE_CHANGED", entityType: "Quote", entityId: quoteId, summary: `${quote.quoteNumber}: ${quote.workflowStage} to ${next}` } });
    return updated;
  });
}
