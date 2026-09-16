import "server-only";

import sanitizeHtml from "sanitize-html";

const SAFE_CONTENT_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
] as const;

export function sanitizeSupplierHtml(value: string | null | undefined): string {
  if (!value) return "";

  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedSchemes: [],
    allowedTags: [...SAFE_CONTENT_TAGS],
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  }).trim();
}

export function supplierContentToPlainText(
  text: string | null | undefined,
  html?: string | null,
): string {
  const source = text?.trim() || html || "";
  const withSectionSpacing = source.replace(
    /<(?:br\s*\/?|\/(?:p|li|tr|td|th|div|h[1-6]))\s*>/gi,
    " ",
  );
  const withoutMarkup = sanitizeHtml(withSectionSpacing, {
    allowedAttributes: {},
    allowedTags: [],
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });

  return withoutMarkup.replace(/\s+/g, " ").trim();
}
