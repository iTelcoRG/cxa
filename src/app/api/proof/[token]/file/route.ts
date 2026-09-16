import { NextResponse } from "next/server";
import { artworkStorage } from "../../../../../artwork/storage.ts";
import { getProofByToken } from "../../../../../operations/proofs.ts";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await getProofByToken(token);
  if (!record) return NextResponse.json({ error: "Proof unavailable" }, { status: 404 });
  const bytes = await artworkStorage.readBytes(record.proof.storageKey);
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": record.proof.mimeType, "Content-Disposition": `inline; filename="proof-v${record.proof.version}.${record.proof.extension}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
