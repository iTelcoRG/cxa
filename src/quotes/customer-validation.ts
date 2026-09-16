import { z } from "zod";

const plainText = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum, `${label} is required.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`)
    .refine(
      (value) => !/[<>\u0000-\u001f\u007f]/.test(value),
      `${label} must be plain text.`,
    );

const optionalPlainText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `${label} must be ${maximum} characters or fewer.`)
    .refine(
      (value) => !/[<>\u0000-\u001f\u007f]/.test(value),
      `${label} must be plain text.`,
    )
    .transform((value) => value || undefined)
    .optional();

function todayInNewZealand(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const customerDetailsSchema = z
  .object({
    customerName: plainText("Name", 2, 100),
    businessName: optionalPlainText("Business name", 150),
    email: z.string().trim().email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(30, "Phone must be 30 characters or fewer.")
      .refine(
        (value) => !value || /^[+()\-\s\d.]{7,30}$/.test(value),
        "Enter a valid phone number.",
      )
      .transform((value) => value || undefined)
      .optional(),
    requiredBy: z
      .string()
      .trim()
      .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid requested date.")
      .refine((value) => {
        if (!value) return true;
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      }, "Enter a valid requested date.")
      .refine((value) => !value || value >= todayInNewZealand(), "Requested date cannot be in the past.")
      .transform((value) => value || undefined)
      .optional(),
    deliveryMethod: z.enum(["DELIVERY", "PICKUP", "TO_BE_CONFIRMED"]),
    deliveryAddress: optionalPlainText("Delivery address", 500),
    customerNotes: optionalPlainText("Additional notes", 1000),
  })
  .superRefine((value, context) => {
    if (value.deliveryMethod === "DELIVERY" && !value.deliveryAddress) {
      context.addIssue({
        code: "custom",
        path: ["deliveryAddress"],
        message: "Delivery address is required for delivery.",
      });
    }
  });

export const quoteSubmissionSchema = z.object({
  customer: customerDetailsSchema,
  lines: z.array(z.unknown()).min(1, "Your quote cart is empty.").max(20, "A quote can contain at most 20 configurations."),
  idempotencyKey: z.string().uuid("Submission identifier is invalid."),
  website: z.string().max(0, "Submission rejected."),
  startedAt: z.number().int().positive(),
  quoteArtwork: z.array(z.object({ clientUploadId: z.string().regex(/^[0-9a-z-]{8,80}$/i), token: z.string().uuid(), originalFileName: z.string().min(1).max(180), mimeType: z.string().max(100), sizeBytes: z.number().int().positive(), status: z.literal("UPLOADED") })).max(10).optional().default([]),
});

export type ValidatedCustomerDetails = z.infer<typeof customerDetailsSchema>;

export function validateSubmissionTiming(startedAt: number, now = Date.now()): string | null {
  const elapsed = now - startedAt;
  if (elapsed < 1_500) return "Please wait a moment and try again.";
  if (elapsed > 24 * 60 * 60 * 1_000) return "This quote form has expired. Please refresh and try again.";
  return null;
}
