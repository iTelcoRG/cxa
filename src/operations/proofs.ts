import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { artworkStorage } from "../artwork/storage.ts";
import { database } from "../lib/database.ts";
import { consumeRateLimit } from "../security/rate-limit.ts";

const proofTypes = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["application/pdf", "pdf"]]);
const maxProofBytes = 15 * 1024 * 1024;
export const hashProofToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createArtworkProof(input: { quoteId: string; quoteLineId: string; decorationId: string; file: File; staffUserId: string; sourceArtworkFileId?: string; note?: string }) {
  const extension = proofTypes.get(input.file.type);
  if (!extension || input.file.size < 1 || input.file.size > maxProofBytes) throw new Error("Proof must be a non-empty PNG, JPG or PDF up to 15 MB.");
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const storageKey = await artworkStorage.saveProof(bytes, extension);
  try {
    return await database.$transaction(async (tx) => {
      const relation = await tx.quoteDecoration.findFirst({ where: { id: input.decorationId, quoteLineId: input.quoteLineId, quoteLine: { quoteId: input.quoteId } } });
      if (!relation) throw new Error("The selected decoration does not belong to this quote line.");
      const latest = await tx.artworkProof.findFirst({ where: { decorationId: input.decorationId }, orderBy: { version: "desc" }, select: { version: true } });
      await tx.artworkProof.updateMany({ where: { decorationId: input.decorationId, status: { notIn: ["APPROVED", "SUPERSEDED"] } }, data: { status: "SUPERSEDED" } });
      const proof = await tx.artworkProof.create({ data: { quoteId: input.quoteId, quoteLineId: input.quoteLineId, decorationId: input.decorationId, sourceArtworkFileId: input.sourceArtworkFileId, version: (latest?.version ?? 0) + 1, originalFileName: input.file.name.replace(/[\r\n<>]/g, "").slice(0, 255), storageKey, mimeType: input.file.type, extension, sizeBytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), staffNote: input.note?.slice(0, 2000), createdById: input.staffUserId } });
      await tx.adminAuditLog.create({ data: { staffUserId: input.staffUserId, action: "ARTWORK_PROOF_CREATED", entityType: "ArtworkProof", entityId: proof.id, summary: `Proof version ${proof.version} created` } });
      return proof;
    });
  } catch (cause) { await artworkStorage.delete(storageKey); throw cause; }
}

export async function readyProofForCustomer(proofId: string, staffUserId: string, lifetimeHours = 168) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + lifetimeHours * 60 * 60 * 1000);
  await database.$transaction(async (tx) => {
    const proof = await tx.artworkProof.update({ where: { id: proofId }, data: { status: "READY_FOR_CUSTOMER" } });
    await tx.proofApprovalToken.updateMany({ where: { proofId, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.proofApprovalToken.create({ data: { proofId, tokenHash: hashProofToken(token), expiresAt } });
    await tx.adminAuditLog.create({ data: { staffUserId, action: "ARTWORK_PROOF_READY", entityType: "ArtworkProof", entityId: proofId, summary: `Proof version ${proof.version} ready for customer` } });
  });
  return { token, expiresAt };
}

export async function revokeProofTokens(proofId: string, staffUserId: string) {
  const proof = await database.artworkProof.findUniqueOrThrow({ where: { id: proofId }, select: { version: true } });
  await database.$transaction(async (tx) => {
    await tx.proofApprovalToken.updateMany({ where: { proofId, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.adminAuditLog.create({ data: { staffUserId, action: "PROOF_TOKEN_REVOKED", entityType: "ArtworkProof", entityId: proofId, summary: `Active link revoked for proof version ${proof.version}` } });
  });
}

export async function getProofByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  const key = hashProofToken(token);
  if (!(await consumeRateLimit("PROOF_ACCESS", key)).allowed) return null;
  const record = await database.proofApprovalToken.findUnique({ where: { tokenHash: key }, include: { proof: { include: { quote: { select: { quoteNumber: true, customerName: true } }, quoteLine: { select: { productNameSnapshot: true, colourDescription: true } }, decoration: { select: { locationLabel: true, methodLabel: true } } } } } });
  if (!record || record.revokedAt || record.expiresAt <= new Date()) return null;
  return record;
}

export async function respondToProof(token: string, decision: "APPROVED" | "REJECTED", note?: string) {
  if (!(await consumeRateLimit("PROOF_ACTION", hashProofToken(token))).allowed) return false;
  const record = await getProofByToken(token);
  if (!record || record.usedAt || record.proof.status !== "READY_FOR_CUSTOMER") return false;
  await database.$transaction(async (tx) => {
    const used = await tx.proofApprovalToken.updateMany({ where: { id: record.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (used.count !== 1) throw new Error("This proof link has already been used.");
    await tx.artworkProof.update({ where: { id: record.proofId }, data: { status: decision, customerResponseNote: note?.replace(/[<>]/g, "").slice(0, 1000) || null, ...(decision === "APPROVED" ? { approvedAt: new Date() } : { rejectedAt: new Date() }) } });
  });
  return true;
}
