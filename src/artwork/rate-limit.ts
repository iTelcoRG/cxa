import "server-only";
export async function allowArtworkUpload(key: string): Promise<boolean> { const { consumeRateLimit } = await import("../security/rate-limit.ts"); return (await consumeRateLimit("ARTWORK_UPLOAD", key)).allowed; }
export async function resetArtworkRateLimit(key = "artwork-test"): Promise<void> { const { clearRateLimit } = await import("../security/rate-limit.ts"); await clearRateLimit("ARTWORK_UPLOAD", key); }
