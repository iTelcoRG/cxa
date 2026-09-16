import {
  DECORATION_LOCATIONS as LOCATION_DEFINITIONS,
  DECORATION_METHODS as METHOD_DEFINITIONS,
} from "./definitions.ts";

export const DECORATION_LOCATIONS = LOCATION_DEFINITIONS.map((item) => item.code);
export const DECORATION_METHODS = METHOD_DEFINITIONS.map((item) => item.code);

export function normalizePlainText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length > maximumLength || /[<>\u0000-\u001f\u007f]/.test(normalized)) {
    return null;
  }
  return normalized;
}
