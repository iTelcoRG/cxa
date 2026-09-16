"use server";

import { revalidatePath } from "next/cache";
import { database } from "../lib/database.ts";
import { createArtworkProof, readyProofForCustomer } from "../operations/proofs.ts";
import { createProductionJob, createPurchaseDrafts, resolveSupplierRequirements } from "../operations/production.ts";
import { transitionWorkflow } from "../operations/workflow.ts";
import type { QuoteWorkflowStage } from "../generated/prisma/client.ts";
import { requireStaff } from "./session.ts";

async function context(quoteId: string) {
  const staff = await requireStaff("quotes:write");
  const quote = await database.quote.findUniqueOrThrow({ where: { id: quoteId }, select: { quoteNumber: true } });
  return { staff, quote };
}
export async function transitionWorkflowAction(quoteId: string, formData: FormData) { const { staff, quote } = await context(quoteId); await transitionWorkflow(quoteId, String(formData.get("stage")) as QuoteWorkflowStage, staff.id, String(formData.get("note") ?? "")); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function confirmNoArtworkAction(quoteId: string, formData: FormData) { const { staff, quote } = await context(quoteId); const note = String(formData.get("note") ?? "").replace(/[<>]/g, "").slice(0, 1000); if (!note) throw new Error("A reason is required."); await database.quote.update({ where: { id: quoteId }, data: { artworkNoFileConfirmedAt: new Date(), artworkNoFileConfirmedById: staff.id, artworkNoFileNote: note } }); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function requestArtworkRevisionAction(quoteId: string, formData: FormData) { const { staff, quote } = await context(quoteId); const request = String(formData.get("request") ?? "").replace(/[<>]/g, "").trim().slice(0, 2000); if (!request) throw new Error("Revision instructions are required."); const revision = await database.artworkRevisionRequest.create({ data: { quoteId, quoteLineId: String(formData.get("quoteLineId") || "") || null, decorationId: String(formData.get("decorationId") || "") || null, request, requestedById: staff.id } }); await database.adminAuditLog.create({ data: { staffUserId: staff.id, action: "ARTWORK_REVISION_REQUESTED", entityType: "ArtworkRevisionRequest", entityId: revision.id, summary: `Artwork revision requested for ${quote.quoteNumber}` } }); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function resolveArtworkRevisionAction(quoteId: string, revisionId: string) { const { staff, quote } = await context(quoteId); await database.artworkRevisionRequest.update({ where: { id: revisionId, quoteId }, data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: staff.id } }); await database.adminAuditLog.create({ data: { staffUserId: staff.id, action: "ARTWORK_REVISION_RESOLVED", entityType: "ArtworkRevisionRequest", entityId: revisionId, summary: `Artwork revision resolved for ${quote.quoteNumber}` } }); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function uploadProofAction(quoteId: string, formData: FormData) { const { staff, quote } = await context(quoteId); const file = formData.get("file"); if (!(file instanceof File)) throw new Error("Choose a proof file."); await createArtworkProof({ quoteId, quoteLineId: String(formData.get("quoteLineId")), decorationId: String(formData.get("decorationId")), sourceArtworkFileId: String(formData.get("sourceArtworkFileId") || "") || undefined, note: String(formData.get("note") ?? ""), file, staffUserId: staff.id }); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function readyProofAction(quoteId: string, proofId: string) { const { staff, quote } = await context(quoteId); await readyProofForCustomer(proofId, staff.id); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function createProductionJobAction(quoteId: string) { const { staff, quote } = await context(quoteId); await createProductionJob(quoteId, staff.id); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); revalidatePath("/admin/production"); }
export async function resolveSupplierRequirementsAction(quoteId: string) { const { staff, quote } = await context(quoteId); await resolveSupplierRequirements(quoteId, staff.id); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function markRequirementsReadyAction(quoteId: string) { const { quote } = await context(quoteId); await database.supplierRequirement.updateMany({ where: { quoteId, supplierVariantId: { not: null }, status: "REQUIRED" }, data: { status: "READY_TO_ORDER" } }); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); }
export async function createPurchaseDraftsAction(quoteId: string) { const { staff, quote } = await context(quoteId); await createPurchaseDrafts(quoteId, staff.id); revalidatePath(`/admin/quotes/${quote.quoteNumber}`); revalidatePath("/admin/purchasing"); }
