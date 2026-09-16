import "server-only";
export async function allowQuoteSubmission(key: string): Promise<boolean> { const { consumeRateLimit } = await import("../security/rate-limit.ts"); return (await consumeRateLimit("QUOTE_SUBMISSION", key)).allowed; }
