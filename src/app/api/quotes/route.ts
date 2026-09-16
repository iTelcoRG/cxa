import { allowQuoteSubmission } from "../../../quotes/rate-limit.ts";
import { submitQuoteRequest } from "../../../quotes/submission.ts";

const MAX_PAYLOAD_BYTES = 100_000;

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_PAYLOAD_BYTES) {
    return Response.json({ ok: false, errors: ["Quote request is too large."] }, { status: 413 });
  }
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateKey = forwardedFor || request.headers.get("user-agent") || "unknown";
  if (!(await allowQuoteSubmission(rateKey))) {
    return Response.json(
      { ok: false, errors: ["Too many quote attempts. Please try again later."] },
      { status: 429 },
    );
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_PAYLOAD_BYTES) {
      return Response.json({ ok: false, errors: ["Quote request is too large."] }, { status: 413 });
    }
    input = JSON.parse(body);
  } catch {
    return Response.json({ ok: false, errors: ["Quote request is malformed."] }, { status: 400 });
  }

  try {
    const result = await submitQuoteRequest(input);
    return Response.json(result, { status: result.ok ? (result.duplicate ? 200 : 201) : 400 });
  } catch {
    return Response.json(
      { ok: false, errors: ["We could not submit your quote right now. Please try again."] },
      { status: 500 },
    );
  }
}
