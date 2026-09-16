import { randomUUID } from "node:crypto";

import { artworkLimits } from "../../../../artwork/config.ts";
import { allowArtworkUpload } from "../../../../artwork/rate-limit.ts";
import { artworkStorage } from "../../../../artwork/storage.ts";
import { validateArtworkUpload } from "../../../../artwork/validation.ts";
import { database } from "../../../../lib/database.ts";
import { DECORATION_LOCATIONS } from "../../../../quote/validation-helpers.ts";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > artworkLimits.maxFileBytes + 100_000) return Response.json({ ok: false, error: "Artwork upload is too large." }, { status: 413 });
  const rateKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("user-agent") || "unknown";
  if (!(await allowArtworkUpload(rateKey))) return Response.json({ ok: false, error: "Too many artwork uploads. Please try again later." }, { status: 429 });
  try {
    const form = await request.formData(); const file = form.get("file"); const quoteLineClientId = String(form.get("quoteLineId") ?? ""); const location = String(form.get("decorationLocation") ?? "");
    if (!(file instanceof File) || !/^[0-9a-z-]{8,80}$/i.test(quoteLineClientId) || (location && !DECORATION_LOCATIONS.includes(location as never))) return Response.json({ ok: false, error: "Artwork association is invalid." }, { status: 400 });
    const existing = await database.temporaryArtworkUpload.aggregate({ where: { quoteLineClientId, consumedAt: null, expiresAt: { gt: new Date() } }, _count: true, _sum: { sizeBytes: true } });
    if (existing._count >= artworkLimits.maxFilesPerQuote) return Response.json({ ok: false, error: "Artwork file limit reached." }, { status: 400 });
    const validated = validateArtworkUpload({ bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name, mimeType: file.type });
    if ((existing._sum.sizeBytes ?? 0) + validated.sizeBytes > artworkLimits.maxTotalBytesPerQuote) return Response.json({ ok: false, error: "Artwork storage quota exceeded." }, { status: 400 });
    const storageKey = await artworkStorage.save(validated.bytes, validated.extension); const token = randomUUID();
    try { await database.temporaryArtworkUpload.create({ data: { clientUploadToken: token, quoteLineClientId, decorationLocation: location ? location as never : null, originalFileName: validated.originalFileName, storageKey, mimeType: validated.mimeType, extension: validated.extension, sizeBytes: validated.sizeBytes, sha256: validated.sha256, expiresAt: new Date(Date.now() + artworkLimits.temporaryLifetimeHours * 60 * 60 * 1000) } }); } catch (cause) { await artworkStorage.delete(storageKey); throw cause; }
    return Response.json({ ok: true, artwork: { token, originalFileName: validated.originalFileName, mimeType: validated.mimeType, sizeBytes: validated.sizeBytes } }, { status: 201 });
  } catch (cause) { const message = cause instanceof Error && cause.message.startsWith("Artwork") ? cause.message : "Artwork upload failed."; return Response.json({ ok: false, error: message }, { status: 400 }); }
}
