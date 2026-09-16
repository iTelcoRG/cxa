import { Readable } from "node:stream";

import { requireStaff } from "../../../../../../admin/session.ts";
import { artworkStorage } from "../../../../../../artwork/storage.ts";
import { safeOriginalFileName } from "../../../../../../artwork/validation.ts";
import { database } from "../../../../../../lib/database.ts";

export async function GET(_request: Request, { params }: { params: Promise<{ artworkId: string }> }) {
  const staff = await requireStaff("quotes:read"); const { artworkId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(artworkId)) return new Response("Not found", { status: 404 });
  const artwork = await database.artworkFile.findUnique({ where: { id: artworkId }, select: { id: true, quoteId: true, originalFileName: true, storageKey: true, status: true, quote: { select: { quoteNumber: true } } } });
  if (!artwork?.quoteId || !artwork.quote || artwork.status === "DELETED") return new Response("Not found", { status: 404 });
  try {
    const filename = safeOriginalFileName(artwork.originalFileName); const stream = await artworkStorage.read(artwork.storageKey);
    await database.$transaction([database.quoteEvent.create({ data: { quoteId: artwork.quoteId, staffUserId: staff.id, eventType: "ARTWORK_DOWNLOADED", message: "Artwork downloaded by authorized staff." } }), database.adminAuditLog.create({ data: { staffUserId: staff.id, action: "ARTWORK_DOWNLOADED", entityType: "ArtworkFile", entityId: artwork.id, summary: `Artwork downloaded for ${artwork.quote.quoteNumber}` } })]);
    return new Response(Readable.toWeb(stream as Readable) as ReadableStream, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch { return new Response("Artwork unavailable", { status: 404 }); }
}
