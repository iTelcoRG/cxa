import { createHash } from "node:crypto";

import { artworkLimits } from "./config.ts";

const policies = {
  png: { mime: "image/png", signature: (bytes: Uint8Array) => [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) },
  jpg: { mime: "image/jpeg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  pdf: { mime: "application/pdf", signature: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" },
  svg: { mime: "image/svg+xml", signature: (bytes: Uint8Array) => { const head = new TextDecoder().decode(bytes.slice(0, 4096)).replace(/^\s*<\?xml[^>]*>\s*/i, "").replace(/^\s*<!--[\s\S]*?-->\s*/, ""); return /^\s*<svg(?:\s|>)/i.test(head) && !/<script(?:\s|>)/i.test(head) && !/\bon\w+\s*=/i.test(head); } },
} as const;

export interface ValidatedArtwork {
  bytes: Uint8Array;
  extension: keyof typeof policies;
  mimeType: string;
  originalFileName: string;
  sha256: string;
  sizeBytes: number;
}

export function safeOriginalFileName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 180 || /[\0\x01-\x1f\x7f]/.test(name) || /[\\/]/.test(name) || name === "." || name === "..") throw new Error("Artwork filename is invalid.");
  return name;
}

export function validateArtworkUpload(input: { bytes: Uint8Array; fileName: string; mimeType: string }): ValidatedArtwork {
  const originalFileName = safeOriginalFileName(input.fileName);
  if (input.bytes.byteLength < 4) throw new Error("Artwork file is empty or malformed.");
  if (input.bytes.byteLength > artworkLimits.maxFileBytes) throw new Error("Artwork file exceeds the allowed size.");
  const rawExtension = originalFileName.split(".").pop()?.toLowerCase();
  const extension = rawExtension === "jpeg" ? "jpg" : rawExtension;
  if (!extension || !(extension in policies)) throw new Error("Artwork file type is not supported.");
  const policy = policies[extension as keyof typeof policies];
  if (input.mimeType.toLowerCase() !== policy.mime) throw new Error("Artwork file extension and MIME type do not match.");
  if (!policy.signature(input.bytes)) throw new Error("Artwork file signature is invalid.");
  return { bytes: input.bytes, extension: extension as keyof typeof policies, mimeType: policy.mime, originalFileName, sha256: createHash("sha256").update(input.bytes).digest("hex"), sizeBytes: input.bytes.byteLength };
}

