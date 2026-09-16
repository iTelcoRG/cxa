import { sendContactEnquiry } from "../../../contact/delivery.ts";
import { submitEnquiry } from "../../../contact/enquiry.ts";
import { consumeRateLimit } from "../../../security/rate-limit.ts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Please send your enquiry from the CXA website." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Expected a JSON enquiry." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > 24_000) return Response.json({ error: "Your enquiry is too long." }, { status: 413 });
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    // Separate identifier, shared persistent enquiry/quote policy: eight attempts per ten minutes.
    const limit = await consumeRateLimit("QUOTE_SUBMISSION", `contact:${ip}`);
    if (!limit.allowed) return Response.json({ error: "Too many enquiries. Please wait a few minutes before trying again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Enter your enquiry details." }, { status: 400 });
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 24_000) { await reader.cancel(); return Response.json({ error: "Your enquiry is too long." }, { status: 413 }); }
      chunks.push(value);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ error: "Check your enquiry and try again." }, { status: 400 }); }
    const result = await submitEnquiry(input, sendContactEnquiry);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ error: "Enquiries are temporarily unavailable. Please email sales@cxa.co.nz." }, { status: 503 });
  }
}
