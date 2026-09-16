import "server-only";
import { database } from "../lib/database.ts";
import { artworkStorage } from "./storage.ts";

export async function cleanupArtwork(options: { dryRun: boolean; now?: Date }) {
  const now = options.now ?? new Date();
  const expired = await database.temporaryArtworkUpload.findMany({ where: { consumedAt: null, expiresAt: { lt: now } }, select: { id: true, storageKey: true } });
  const referenced = new Set([...(await database.temporaryArtworkUpload.findMany({ select: { storageKey: true } })).map((item) => item.storageKey), ...(await database.artworkFile.findMany({ where: { status: { not: "DELETED" } }, select: { storageKey: true } })).map((item) => item.storageKey)]);
  const orphaned = (await artworkStorage.list()).filter((key) => !referenced.has(key));
  if (!options.dryRun) { for (const item of expired) await artworkStorage.delete(item.storageKey); await database.temporaryArtworkUpload.deleteMany({ where: { id: { in: expired.map((item) => item.id) } } }); for (const key of orphaned) await artworkStorage.delete(key); }
  return { dryRun: options.dryRun, expiredTemporaryUploads: expired.length, orphanedStorageFiles: orphaned.length, linkedArtworkRetained: await database.artworkFile.count({ where: { status: { not: "DELETED" } } }) };
}
