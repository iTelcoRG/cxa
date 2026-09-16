import "server-only";
import { PremiumApparelError } from "./errors.ts";
import type { PremiumApparelProductSample } from "./types.ts";

export interface StreamedProductSummary {
  asOf: string;
  count: number;
  removedStyles: unknown[];
  bytesRead: number;
}

export async function streamPremiumApparelProducts(
  response: Response,
  batchSize: number,
  onBatch: (products: PremiumApparelProductSample[], batchNumber: number) => Promise<void>,
  maximumBytes = Number(process.env.PREMIUM_APPAREL_MAX_RESPONSE_BYTES ?? 134_217_728),
): Promise<StreamedProductSummary> {
  if (!response.body) throw new PremiumApparelError("Premium Apparel returned an empty product response.", { code: "invalid_response" });
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error("Product sync batch size must be between 1 and 500.");
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw new Error("Product response limit is invalid.");
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let buffer = ""; let bytesRead = 0; let asOf = ""; let productsStarted = false; let productsEnded = false; let objectStart = -1; let depth = 0; let inString = false; let escaped = false; let scan = 0; let count = 0; let batchNumber = 0; let batch: PremiumApparelProductSample[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) { await reader.cancel(); throw new PremiumApparelError("Premium Apparel product response exceeded its configured size limit.", { code: "invalid_response" }); }
      buffer += decoder.decode(value, { stream: true });
      if (!asOf) asOf = /"as_of"\s*:\s*"([^"]+)"/.exec(buffer)?.[1] ?? "";
      if (!productsStarted) {
        const key = buffer.indexOf('"products"'); const start = key < 0 ? -1 : buffer.indexOf("[", key);
        if (start < 0) { if (buffer.length > 65_536) throw new PremiumApparelError("Premium Apparel product response has no products array.", { code: "invalid_response" }); continue; }
        productsStarted = true; buffer = buffer.slice(start + 1); scan = 0;
      }
      while (!productsEnded && scan < buffer.length) {
        const char = buffer[scan];
        if (inString) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') inString = false; scan += 1; continue; }
        if (char === '"') inString = true;
        else if (char === "{") { if (depth === 0) objectStart = scan; depth += 1; }
        else if (char === "}") {
          depth -= 1;
          if (depth === 0 && objectStart >= 0) {
            batch.push(JSON.parse(buffer.slice(objectStart, scan + 1)) as PremiumApparelProductSample); count += 1;
            buffer = buffer.slice(scan + 1); scan = 0; objectStart = -1;
            if (batch.length >= batchSize) { batchNumber += 1; await onBatch(batch, batchNumber); batch = []; }
            continue;
          }
        } else if (char === "]" && depth === 0) { productsEnded = true; buffer = buffer.slice(scan + 1); scan = 0; break; }
        scan += 1;
      }
    }
    buffer += decoder.decode();
    if (batch.length) { batchNumber += 1; await onBatch(batch, batchNumber); }
  } finally { reader.releaseLock(); }
  if (!productsEnded || !asOf) throw new PremiumApparelError("Premium Apparel returned an incomplete product response.", { code: "invalid_response" });
  const marker = buffer.indexOf('"removed_styles"'); const arrayStart = marker < 0 ? -1 : buffer.indexOf("[", marker); let removedStyles: unknown[] = [];
  if (arrayStart >= 0) { const arrayEnd = findJsonArrayEnd(buffer, arrayStart); if (arrayEnd >= 0) removedStyles = JSON.parse(buffer.slice(arrayStart, arrayEnd + 1)) as unknown[]; }
  return { asOf, count, removedStyles, bytesRead };
}

function findJsonArrayEnd(value: string, start: number): number {
  let depth = 0; let inString = false; let escaped = false;
  for (let index = start; index < value.length; index += 1) { const char = value[index]; if (inString) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') inString = false; continue; } if (char === '"') inString = true; else if (char === "[") depth += 1; else if (char === "]" && --depth === 0) return index; }
  return -1;
}
