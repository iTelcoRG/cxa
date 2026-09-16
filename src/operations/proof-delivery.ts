import "server-only";
import { database } from "../lib/database.ts";
import { deliverNotification } from "../notifications/delivery.ts";
import { readyProofForCustomer } from "./proofs.ts";
import { transitionWorkflow } from "./workflow.ts";

export function buildProofReadyEmail(input: { quoteNumber: string; product: string; location: string; method: string; link: string; expiresAt: Date }) { return { subject: `Your CXA artwork proof is ready - ${input.quoteNumber}`, text: [`Your CXA artwork proof is ready for review.`, "", `Quote: ${input.quoteNumber}`, `Product: ${input.product}`, `Decoration: ${input.location} / ${input.method}`, "", "Please approve the proof or request changes before production can begin.", `REVIEW PROOF: ${input.link}`, `This secure link expires ${input.expiresAt.toLocaleString("en-NZ")}.`, "", "CXA - Custom X Apparel"].join("\n") }; }
export async function sendProofToCustomer(proofId: string, staffUserId: string, options: { simulate?: boolean } = {}) {
  const proof = await database.artworkProof.findUniqueOrThrow({ where: { id: proofId }, include: { quote: true, quoteLine: true, decoration: true } });
  const issued = await readyProofForCustomer(proofId, staffUserId);
  const baseUrl = (process.env.CXA_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const email = buildProofReadyEmail({ quoteNumber: proof.quote.quoteNumber, product: proof.quoteLine.productNameSnapshot, location: proof.decoration.locationLabel, method: proof.decoration.methodLabel, link: `${baseUrl}/proof/${issued.token}`, expiresAt: issued.expiresAt });
  const delivery = await deliverNotification({ quoteId: proof.quoteId, proofId, type: "PROOF_READY", recipientType: "CUSTOMER", to: proof.quote.email, subject: email.subject, text: email.text, simulate: options.simulate });
  await database.adminAuditLog.create({ data: { staffUserId, action: "NOTIFICATION_SENT", entityType: "ArtworkProof", entityId: proofId, summary: `Proof-ready notification ${delivery.status.toLowerCase()} for ${proof.quote.quoteNumber}` } });
  if (proof.quote.workflowStage === "PROOF_PREPARATION") await transitionWorkflow(proof.quoteId, "AWAITING_CUSTOMER_APPROVAL", staffUserId, "Proof prepared and customer notification attempted.");
  return { delivery, expiresAt: issued.expiresAt };
}
