import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "../generated/prisma/client.ts";
import { database } from "../lib/database.ts";
import { decorationLocationLabel, decorationMethodLabel } from "../quote/definitions.ts";
import { revalidateQuoteLineForSubmission } from "../quote/server-validation.ts";
import type { QuoteLine } from "../quote/types.ts";
import {
  quoteSubmissionSchema,
  validateSubmissionTiming,
  type ValidatedCustomerDetails,
} from "./customer-validation.ts";
import {
  sendQuoteNotifications,
  type NotificationAttempt,
  type NotificationQuote,
} from "./notifications.ts";
import type { QuoteSubmissionResult } from "./types.ts";
import { artworkLimits } from "../artwork/config.ts";

type NotificationSender = (quote: NotificationQuote) => Promise<NotificationAttempt>;

interface ValidatedSnapshotLine {
  line: QuoteLine;
  brand: string | null;
  category: string | null;
}

function quoteYear(date: Date): number {
  const year = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
  }).format(date);
  return Number(year);
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.join(".") || "form";
    errors[path] = [...(errors[path] ?? []), issue.message];
  }
  return errors;
}

async function findExisting(idempotencyKey: string) {
  return database.quote.findUnique({
    where: { idempotencyKey },
    select: { confirmationToken: true, quoteNumber: true },
  });
}

async function persistQuote(
  customer: ValidatedCustomerDetails,
  lines: ValidatedSnapshotLine[],
  idempotencyKey: string,
  now: Date,
  quoteArtwork: Array<{ clientUploadId: string; token: string; originalFileName: string; sizeBytes: number }>,
) {
  const confirmationToken = randomBytes(32).toString("base64url");
  const year = quoteYear(now);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await database.$transaction(
        async (transaction) => {
          const existing = await transaction.quote.findUnique({
            where: { idempotencyKey },
            select: { confirmationToken: true, id: true, quoteNumber: true },
          });
          if (existing) return { created: false, quote: existing };

          const counter = await transaction.quoteNumberCounter.upsert({
            where: { year },
            create: { year, nextValue: 1 },
            update: { nextValue: { increment: 1 } },
          });
          const quoteNumber = `CXA-${year}-${String(counter.nextValue).padStart(5, "0")}`;
          const quote = await transaction.quote.create({
            data: {
              businessName: customer.businessName,
              confirmationToken,
              customerName: customer.customerName,
              customerNotes: customer.customerNotes,
              deliveryAddress:
                customer.deliveryMethod === "DELIVERY"
                  ? customer.deliveryAddress
                  : null,
              deliveryMethod: customer.deliveryMethod,
              email: customer.email,
              idempotencyKey,
              phone: customer.phone,
              quoteNumber,
              requiredBy: customer.requiredBy
                ? new Date(`${customer.requiredBy}T00:00:00.000Z`)
                : null,
              status: "SUBMITTED",
              submittedAt: now,
              events: {
                create: { eventType: "QUOTE_SUBMITTED" },
              },
              workflowEvents: {
                create: {
                  newStage: "QUOTE_SUBMITTED",
                  note: "Operational workflow initialised at quote submission.",
                },
              },
              lines: {
                create: lines.map(({ line, brand, category }, sortOrder) => ({
                  brandSnapshot: brand,
                  categorySnapshot: category,
                  colourCode: line.colourCode,
                  colourDescription: line.colourDescription,
                  customerNotes: line.customerNotes,
                  imageUrl: line.productImage,
                  productId: line.productId,
                  productNameSnapshot: line.productName,
                  productSlugSnapshot: line.productSlug,
                  sortOrder,
                  totalQuantity: line.totalGarmentQuantity,
                  sizes: {
                    create: Object.entries(line.sizeQuantities).map(
                      ([size, quantity]) => ({ size, quantity }),
                    ),
                  },
                  decorations: {
                    create: line.decorations.map((decoration) => ({
                      customerNote: decoration.note,
                      location: decoration.location,
                      locationLabel: decorationLocationLabel(decoration.location),
                      method: decoration.method,
                      methodLabel: decorationMethodLabel(decoration.method),
                    })),
                  },
                })),
              },
            },
            select: { confirmationToken: true, id: true, quoteNumber: true },
          });
          const createdLines = await transaction.quoteLine.findMany({ where: { quoteId: quote.id }, orderBy: { sortOrder: "asc" }, select: { id: true, decorations: { select: { id: true, location: true } } } });
          for (const [lineIndex, snapshot] of lines.entries()) {
            const createdLine = createdLines[lineIndex]; if (!createdLine) throw new Error("Quote artwork line association failed.");
            for (const selection of snapshot.line.decorations) {
              if (!selection.artwork) continue;
              const temporary = await transaction.temporaryArtworkUpload.findUnique({ where: { clientUploadToken: selection.artwork.token } });
              if (!temporary || temporary.consumedAt || temporary.expiresAt <= now || temporary.quoteLineClientId !== snapshot.line.quoteLineId || temporary.decorationLocation !== selection.location || temporary.originalFileName !== selection.artwork.originalFileName || temporary.sizeBytes !== selection.artwork.sizeBytes) throw new Error("Quote artwork association is invalid or expired.");
              const decoration = createdLine.decorations.find((item) => item.location === selection.location); if (!decoration) throw new Error("Quote artwork decoration association failed.");
              const consumed = await transaction.temporaryArtworkUpload.updateMany({ where: { id: temporary.id, consumedAt: null }, data: { consumedAt: now } }); if (consumed.count !== 1) throw new Error("Quote artwork was already consumed.");
              await transaction.artworkFile.create({ data: { quoteId: quote.id, quoteLineId: createdLine.id, decorationId: decoration.id, temporaryUploadId: temporary.id, originalFileName: temporary.originalFileName, storageKey: temporary.storageKey, mimeType: temporary.mimeType, extension: temporary.extension, sizeBytes: temporary.sizeBytes, sha256: temporary.sha256, uploadedAt: temporary.createdAt } });
              await transaction.quoteEvent.create({ data: { quoteId: quote.id, eventType: "ARTWORK_UPLOADED", message: `Artwork received for ${decoration.location}.` } });
            }
          }
          for (const selection of quoteArtwork) {
            const temporary = await transaction.temporaryArtworkUpload.findUnique({ where: { clientUploadToken: selection.token } });
            if (!temporary || temporary.consumedAt || temporary.expiresAt <= now || temporary.quoteLineClientId !== selection.clientUploadId || temporary.decorationLocation !== null || temporary.originalFileName !== selection.originalFileName || temporary.sizeBytes !== selection.sizeBytes) throw new Error("Quote-level artwork association is invalid or expired.");
            const consumed = await transaction.temporaryArtworkUpload.updateMany({ where: { id: temporary.id, consumedAt: null }, data: { consumedAt: now } }); if (consumed.count !== 1) throw new Error("Quote artwork was already consumed.");
            await transaction.artworkFile.create({ data: { quoteId: quote.id, temporaryUploadId: temporary.id, originalFileName: temporary.originalFileName, storageKey: temporary.storageKey, mimeType: temporary.mimeType, extension: temporary.extension, sizeBytes: temporary.sizeBytes, sha256: temporary.sha256, uploadedAt: temporary.createdAt } });
            await transaction.quoteEvent.create({ data: { quoteId: quote.id, eventType: "ARTWORK_UPLOADED", message: "General quote artwork received." } });
          }
          return { created: true, quote };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await findExisting(idempotencyKey);
        if (existing) return { created: false, quote: { ...existing, id: null } };
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) continue;
      throw error;
    }
  }
  throw new Error("Quote transaction retry limit exceeded.");
}

async function notificationQuote(quoteId: string): Promise<NotificationQuote> {
  const quote = await database.quote.findUniqueOrThrow({
    where: { id: quoteId },
    select: {
      businessName: true,
      customerName: true,
      customerNotes: true,
      deliveryMethod: true,
      email: true,
      phone: true,
      quoteNumber: true,
      requiredBy: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          colourDescription: true,
          customerNotes: true,
          productNameSnapshot: true,
          sizes: { select: { quantity: true, size: true }, orderBy: { size: "asc" } },
          decorations: {
            select: { customerNote: true, locationLabel: true, methodLabel: true },
          },
        },
      },
      artworkFiles: { where: { status: { not: "DELETED" } }, orderBy: { uploadedAt: "asc" }, select: { originalFileName: true } },
    },
  });
  return {
    ...quote,
    artworkFiles: quote.artworkFiles.map((file) => file.originalFileName),
    totalGarments: quote.lines.reduce(
      (total, line) =>
        total + line.sizes.reduce((lineTotal, size) => lineTotal + size.quantity, 0),
      0,
    ),
    lines: quote.lines.map((line) => ({
      colourDescription: line.colourDescription,
      customerNotes: line.customerNotes,
      productName: line.productNameSnapshot,
      sizes: line.sizes,
      decorations: line.decorations,
    })),
  };
}

async function recordNotificationEvents(
  quoteId: string,
  attempt: NotificationAttempt,
): Promise<void> {
  await database.notificationDelivery.createMany({ data: [{ quoteId, type: "STAFF_QUOTE_NOTIFICATION", recipientType: "STAFF", status: attempt.staff.toUpperCase() as "SENT" | "FAILED" | "SKIPPED", sentAt: attempt.staff === "sent" ? new Date() : null, safeErrorSummary: attempt.staff === "failed" ? "Staff notification delivery failed." : null }, { quoteId, type: "CUSTOMER_ACKNOWLEDGEMENT", recipientType: "CUSTOMER", status: attempt.customer.toUpperCase() as "SENT" | "FAILED" | "SKIPPED", sentAt: attempt.customer === "sent" ? new Date() : null, safeErrorSummary: attempt.customer === "failed" ? "Customer acknowledgement delivery failed." : null }] });
  const events = [];
  if (attempt.staff !== "skipped") {
    events.push({
      eventType:
        attempt.staff === "sent"
          ? ("STAFF_NOTIFICATION_SENT" as const)
          : ("STAFF_NOTIFICATION_FAILED" as const),
      message: attempt.staff === "failed" ? "Staff notification delivery failed." : undefined,
    });
  }
  if (attempt.customer !== "skipped") {
    events.push({
      eventType:
        attempt.customer === "sent"
          ? ("CUSTOMER_CONFIRMATION_SENT" as const)
          : ("CUSTOMER_CONFIRMATION_FAILED" as const),
      message:
        attempt.customer === "failed"
          ? "Customer confirmation delivery failed."
          : undefined,
    });
  }
  if (events.length) {
    await database.quoteEvent.createMany({
      data: events.map((event) => ({ ...event, quoteId })),
    });
  }
}

export async function submitQuoteRequest(
  input: unknown,
  options: { now?: Date; notifier?: NotificationSender } = {},
): Promise<QuoteSubmissionResult> {
  const parsed = quoteSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const existing = await findExisting(parsed.data.idempotencyKey);
  if (existing) return { ok: true, ...existing, duplicate: true };

  const now = options.now ?? new Date();
  const timingError = validateSubmissionTiming(parsed.data.startedAt, now.getTime());
  if (timingError) return { ok: false, errors: [timingError] };

  const snapshots: ValidatedSnapshotLine[] = [];
  const lineErrors: string[] = [];
  for (const [index, candidate] of parsed.data.lines.entries()) {
    const validation = await revalidateQuoteLineForSubmission(candidate);
    if (!validation.result.valid || !validation.result.line || !validation.product) {
      lineErrors.push(
        ...validation.result.errors.map(
          (error) => `Configuration ${index + 1}: ${error}`,
        ),
      );
      continue;
    }
    snapshots.push({
      line: validation.result.line,
      brand: validation.product.brand,
      category: validation.product.category,
    });
  }
  if (lineErrors.length) return { ok: false, errors: lineErrors };

  const artworkSelections = snapshots.flatMap(({ line }) => line.decorations.flatMap((selection) => selection.artwork ? [{ ...selection.artwork, quoteLineId: line.quoteLineId, location: selection.location }] : []));
  const allArtwork = [...artworkSelections, ...parsed.data.quoteArtwork];
  if (allArtwork.length > artworkLimits.maxFilesPerQuote || allArtwork.reduce((total, item) => total + item.sizeBytes, 0) > artworkLimits.maxTotalBytesPerQuote) return { ok: false, errors: ["Artwork files exceed the quote upload limits."] };
  if (new Set(allArtwork.map((item) => item.token)).size !== allArtwork.length) return { ok: false, errors: ["Each artwork upload can only be associated once."] };
  if (artworkSelections.length) {
    const temporary = await database.temporaryArtworkUpload.findMany({ where: { clientUploadToken: { in: artworkSelections.map((item) => item.token) }, consumedAt: null, expiresAt: { gt: now } }, select: { clientUploadToken: true, quoteLineClientId: true, decorationLocation: true, originalFileName: true, sizeBytes: true } });
    const valid = artworkSelections.every((selection) => temporary.some((item) => item.clientUploadToken === selection.token && item.quoteLineClientId === selection.quoteLineId && item.decorationLocation === selection.location && item.originalFileName === selection.originalFileName && item.sizeBytes === selection.sizeBytes));
    if (!valid) return { ok: false, errors: ["One or more artwork uploads are invalid or expired. Replace or remove them before submitting."] };
  }
  if (parsed.data.quoteArtwork.length) { const temporary = await database.temporaryArtworkUpload.findMany({ where: { clientUploadToken: { in: parsed.data.quoteArtwork.map((item) => item.token) }, consumedAt: null, expiresAt: { gt: now }, decorationLocation: null }, select: { clientUploadToken: true, quoteLineClientId: true, originalFileName: true, sizeBytes: true } }); if (!parsed.data.quoteArtwork.every((selection) => temporary.some((item) => item.clientUploadToken === selection.token && item.quoteLineClientId === selection.clientUploadId && item.originalFileName === selection.originalFileName && item.sizeBytes === selection.sizeBytes))) return { ok: false, errors: ["One or more quote artwork uploads are invalid or expired."] }; }

  const persisted = await persistQuote(
    parsed.data.customer,
    snapshots,
    parsed.data.idempotencyKey,
    now,
    parsed.data.quoteArtwork,
  );
  if (persisted.created && persisted.quote.id) {
    let attempt: NotificationAttempt;
    try {
      attempt = await (options.notifier ?? sendQuoteNotifications)(
        await notificationQuote(persisted.quote.id),
      );
    } catch {
      attempt = { staff: "failed", customer: "failed" };
    }
    await recordNotificationEvents(persisted.quote.id, attempt);
  }

  return {
    ok: true,
    confirmationToken: persisted.quote.confirmationToken,
    duplicate: !persisted.created,
    quoteNumber: persisted.quote.quoteNumber,
  };
}
