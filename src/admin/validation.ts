import { z } from "zod";

export const safeId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const safeSlug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const safeName = z.string().trim().min(1).max(160);
export const safeDescription = z
  .string()
  .trim()
  .max(5000)
  .transform((value) => value || null);
export const safeNote = z
  .string()
  .trim()
  .min(1)
  .max(4000)
  .refine((value) => !/[<>]/.test(value), "Notes must be plain text.");
export const safeSearch = z.string().trim().max(120).catch("");
