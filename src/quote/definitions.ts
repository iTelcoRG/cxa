export const DECORATION_LOCATIONS = [
  { code: "FRONT_LEFT_CHEST", label: "Left Chest" },
  { code: "FRONT_RIGHT_CHEST", label: "Right Chest" },
  { code: "FRONT_CENTRE", label: "Centre Front" },
  { code: "FRONT_FULL", label: "Full Front" },
  { code: "BACK_UPPER", label: "Upper Back" },
  { code: "BACK_FULL", label: "Full Back" },
  { code: "LEFT_SLEEVE", label: "Left Sleeve" },
  { code: "RIGHT_SLEEVE", label: "Right Sleeve" },
] as const;

export type DecorationLocation = (typeof DECORATION_LOCATIONS)[number]["code"];

export const DECORATION_METHODS = [
  { code: "SCREEN_PRINT", label: "Screen Print", productKey: "screenPrint" },
  { code: "EMBROIDERY", label: "Embroidery", productKey: "embroidery" },
  { code: "DTF", label: "DTF", productKey: "dtf" },
] as const;

export type DecorationMethod = (typeof DECORATION_METHODS)[number]["code"];

export const LOCATION_NOTE_MAX_LENGTH = 200;
export const CUSTOMER_NOTE_MAX_LENGTH = 500;

export function decorationLocationLabel(code: DecorationLocation): string {
  return DECORATION_LOCATIONS.find((location) => location.code === code)?.label ?? code;
}

export function decorationMethodLabel(code: DecorationMethod): string {
  return DECORATION_METHODS.find((method) => method.code === code)?.label ?? code;
}
