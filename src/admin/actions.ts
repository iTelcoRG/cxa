"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { database } from "../lib/database.ts";
import { sendQuoteNotifications } from "../quotes/notifications.ts";
import { queuePremiumApparelSync } from "../suppliers/premium-apparel/jobs.ts";
import { requireStaff } from "./session.ts";
import { canTransitionQuote, type AdminQuoteStatus } from "./quote-workflow.ts";
import {
  safeDescription,
  safeId,
  safeName,
  safeNote,
  safeSlug,
} from "./validation.ts";

const quoteStatus = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "QUOTED",
  "APPROVED",
  "DECLINED",
  "IN_PRODUCTION",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);
const artworkStatus = z.enum(["APPROVED", "REJECTED", "ARCHIVED"]);

export async function updateArtworkStatus(artworkId: string, formData: FormData) {
  const staff = await requireStaff("quotes:write"); const id = safeId.parse(artworkId); const status = artworkStatus.parse(formData.get("status")); const note = String(formData.get("staffNote") ?? "").trim(); const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (note.length > 2000 || rejectionReason.length > 1000 || /[<>]/.test(note + rejectionReason)) throw new Error("Artwork notes must be safe plain text.");
  if (status === "REJECTED" && !rejectionReason) throw new Error("A rejection reason is required.");
  const artwork = await database.artworkFile.findUnique({ where: { id }, select: { quoteId: true, quote: { select: { quoteNumber: true } } } }); if (!artwork?.quoteId || !artwork.quote) throw new Error("Artwork not found.");
  const eventType = status === "APPROVED" ? "ARTWORK_APPROVED" : status === "REJECTED" ? "ARTWORK_REJECTED" : "ARTWORK_ARCHIVED";
  await database.$transaction([database.artworkFile.update({ where: { id }, data: { status, staffNote: note || null, rejectionReason: status === "REJECTED" ? rejectionReason : null } }), database.quoteEvent.create({ data: { quoteId: artwork.quoteId, staffUserId: staff.id, eventType, message: `Artwork ${status.toLowerCase()}.` } }), database.adminAuditLog.create({ data: { staffUserId: staff.id, action: eventType, entityType: "ArtworkFile", entityId: id, summary: `Artwork ${status.toLowerCase()} for ${artwork.quote.quoteNumber}` } })]);
  revalidatePath(`/admin/quotes/${artwork.quote.quoteNumber}`);
}

export async function updateQuoteStatus(quoteId: string, formData: FormData) {
  const staff = await requireStaff("quotes:write");
  const id = safeId.parse(quoteId);
  const next = quoteStatus.parse(formData.get("status"));
  const quote = await database.quote.findUnique({
    where: { id },
    select: { id: true, quoteNumber: true, status: true },
  });
  if (!quote || !canTransitionQuote(quote.status as AdminQuoteStatus, next))
    throw new Error("That quote status transition is not allowed.");
  await database.$transaction(async (tx) => {
    await tx.quote.update({ where: { id }, data: { status: next } });
    await tx.quoteEvent.create({
      data: {
        quoteId: id,
        eventType: "STATUS_CHANGED",
        previousStatus: quote.status,
        newStatus: next,
        staffUserId: staff.id,
        message: `${quote.status} to ${next}`,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "QUOTE_STATUS_CHANGED",
        entityType: "Quote",
        entityId: id,
        summary: `Quote ${quote.quoteNumber}: ${quote.status} to ${next}`,
      },
    });
  });
  revalidatePath(`/admin/quotes/${quote.quoteNumber}`);
  revalidatePath("/admin/quotes");
}

export async function addInternalNote(quoteId: string, formData: FormData) {
  const staff = await requireStaff("quotes:write");
  const id = safeId.parse(quoteId);
  const body = safeNote.parse(formData.get("body"));
  const quote = await database.quote.findUnique({
    where: { id },
    select: { quoteNumber: true },
  });
  if (!quote) throw new Error("Quote not found.");
  await database.$transaction(async (tx) => {
    await tx.quoteInternalNote.create({
      data: { quoteId: id, staffUserId: staff.id, body },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "QUOTE_INTERNAL_NOTE_ADDED",
        entityType: "Quote",
        entityId: id,
        summary: `Internal note added to ${quote.quoteNumber}`,
      },
    });
  });
  revalidatePath(`/admin/quotes/${quote.quoteNumber}`);
}

export async function resendQuoteNotification(
  quoteId: string,
  formData: FormData,
) {
  const staff = await requireStaff("quotes:write");
  const id = safeId.parse(quoteId);
  const target = z.enum(["customer", "staff"]).parse(formData.get("target"));
  const quote = await database.quote.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { sizes: true, decorations: true },
      },
      artworkFiles: { where: { status: { not: "DELETED" } }, orderBy: { uploadedAt: "asc" }, select: { originalFileName: true } },
    },
  });
  if (!quote) throw new Error("Quote not found.");
  const payload = {
    ...quote,
    totalGarments: quote.lines.reduce(
      (sum, line) => sum + line.totalQuantity,
      0,
    ),
    artworkFiles: quote.artworkFiles.map((file) => file.originalFileName),
    lines: quote.lines.map((line) => ({
      productName: line.productNameSnapshot,
      colourDescription: line.colourDescription,
      customerNotes: line.customerNotes,
      sizes: line.sizes,
      decorations: line.decorations,
    })),
  };
  const result = await sendQuoteNotifications(payload, target);
  const state = target === "customer" ? result.customer : result.staff;
  await database.$transaction(async (tx) => {
    await tx.quoteEvent.create({
      data: {
        quoteId: id,
        eventType: "NOTIFICATION_RESENT",
        staffUserId: staff.id,
        message: `${target} notification ${state}`,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "NOTIFICATION_RESENT",
        entityType: "Quote",
        entityId: id,
        summary: `${target} notification resend ${state}`,
      },
    });
  });
  revalidatePath(`/admin/quotes/${quote.quoteNumber}`);
}

const productInput = z.object({
  name: safeName,
  slug: safeSlug,
  description: safeDescription,
  brandId: z.string().max(64).nullable(),
  categoryId: z.string().max(64).nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  primaryImage: z.string().url().max(2000).nullable(),
  featured: z.boolean(),
  newProduct: z.boolean(),
  screenPrint: z.boolean(),
  embroidery: z.boolean(),
  dtf: z.boolean(),
});
const bool = (data: FormData, key: string) => data.get(key) === "on";
const nullable = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim() || null;

export async function updateProduct(productId: string, formData: FormData) {
  const staff = await requireStaff("catalogue:write");
  const id = safeId.parse(productId);
  const value = productInput.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    brandId: nullable(formData, "brandId"),
    categoryId: nullable(formData, "categoryId"),
    status: formData.get("status"),
    primaryImage: nullable(formData, "primaryImage"),
    featured: bool(formData, "featured"),
    newProduct: bool(formData, "newProduct"),
    screenPrint: bool(formData, "screenPrint"),
    embroidery: bool(formData, "embroidery"),
    dtf: bool(formData, "dtf"),
  });
  const current = await database.product.findUnique({
    where: { id },
    select: { status: true, supplierLinks: { take: 1 }, primaryImage: true },
  });
  if (!current) throw new Error("Product not found.");
  if (
    value.status === "PUBLISHED" &&
    (!value.name ||
      !value.slug ||
      current.supplierLinks.length === 0 ||
      !(value.primaryImage || current.primaryImage))
  )
    throw new Error(
      "Published products require a name, slug, supplier link and image.",
    );
  await database.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: value });
    const action =
      current.status !== value.status && value.status === "PUBLISHED"
        ? "PRODUCT_PUBLISHED"
        : current.status === "PUBLISHED" && value.status !== "PUBLISHED"
          ? "PRODUCT_UNPUBLISHED"
          : "PRODUCT_UPDATED";
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action,
        entityType: "Product",
        entityId: id,
        summary: `CXA product updated; status ${value.status}`,
      },
    });
  });
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function publishSupplierProduct(
  supplierProductId: string,
  formData: FormData,
) {
  const staff = await requireStaff("catalogue:write");
  const sourceId = safeId.parse(supplierProductId);
  const input = z
    .object({
      name: safeName,
      slug: safeSlug,
      description: safeDescription,
      brandId: safeId,
      categoryId: safeId,
      status: z.enum(["DRAFT", "PUBLISHED"]),
    })
    .parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      brandId: formData.get("brandId"),
      categoryId: formData.get("categoryId"),
      status: formData.get("status"),
    });
  const source = await database.supplierProduct.findUnique({
    where: { id: sourceId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      catalogueLinks: true,
    },
  });
  if (!source) throw new Error("Supplier product not found.");
  if (source.catalogueLinks.length)
    redirect(`/admin/products/${source.catalogueLinks[0].productId}`);
  const product = await database.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...input,
        primaryImage: source.images[0]?.url ?? null,
        screenPrint: bool(formData, "screenPrint"),
        embroidery: bool(formData, "embroidery"),
        dtf: bool(formData, "dtf"),
        featured: bool(formData, "featured"),
        newProduct: bool(formData, "newProduct"),
      },
    });
    await tx.productSupplier.create({
      data: {
        productId: created.id,
        supplierProductId: sourceId,
        preferredSupplier: true,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "SUPPLIER_PRODUCT_PUBLISHED",
        entityType: "SupplierProduct",
        entityId: sourceId,
        summary: `Published supplier product to CXA draft ${created.id}`,
      },
    });
    return created;
  });
  redirect(`/admin/products/${product.id}`);
}

export async function linkSupplierProduct(
  supplierProductId: string,
  formData: FormData,
) {
  const staff = await requireStaff("catalogue:write");
  const sourceId = safeId.parse(supplierProductId);
  const productId = safeId.parse(formData.get("productId"));
  await database.$transaction(async (tx) => {
    await tx.productSupplier.upsert({
      where: {
        productId_supplierProductId: { productId, supplierProductId: sourceId },
      },
      create: {
        productId,
        supplierProductId: sourceId,
        preferredSupplier: false,
      },
      update: {},
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "SUPPLIER_PRODUCT_LINKED",
        entityType: "SupplierProduct",
        entityId: sourceId,
        summary: `Linked supplier product to CXA product ${productId}`,
      },
    });
  });
  revalidatePath(`/admin/suppliers`);
}

export async function setPreferredSupplier(
  productId: string,
  formData: FormData,
) {
  const staff = await requireStaff("catalogue:write");
  const id = safeId.parse(productId);
  const linkId = safeId.parse(formData.get("linkId"));
  const link = await database.productSupplier.findFirst({
    where: { id: linkId, productId: id },
    select: { id: true },
  });
  if (!link) throw new Error("Supplier link not found for this product.");
  await database.$transaction(async (tx) => {
    await tx.productSupplier.updateMany({
      where: { productId: id },
      data: { preferredSupplier: false },
    });
    await tx.productSupplier.update({
      where: { id: linkId },
      data: { preferredSupplier: true },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staff.id,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: id,
        summary: "Preferred supplier updated",
      },
    });
  });
  revalidatePath(`/admin/products/${id}`);
}

export async function saveBrand(formData: FormData) {
  const staff = await requireStaff("catalogue:write");
  const id = nullable(formData, "id");
  const data = z
    .object({
      name: safeName,
      slug: safeSlug,
      description: safeDescription,
      active: z.boolean(),
    })
    .parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      active: bool(formData, "active"),
    });
  const record = id
    ? await database.brand.update({ where: { id: safeId.parse(id) }, data })
    : await database.brand.create({ data });
  await database.adminAuditLog.create({
    data: {
      staffUserId: staff.id,
      action: id ? "BRAND_UPDATED" : "BRAND_CREATED",
      entityType: "Brand",
      entityId: record.id,
      summary: `Brand ${id ? "updated" : "created"}: ${record.name}`,
    },
  });
  revalidatePath("/admin/brands");
  revalidatePath("/brands");
}

export async function saveCategory(formData: FormData) {
  const staff = await requireStaff("catalogue:write");
  const id = nullable(formData, "id");
  const data = z
    .object({
      name: safeName,
      slug: safeSlug,
      description: safeDescription,
      parentId: z.string().max(64).nullable(),
      active: z.boolean(),
    })
    .parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      parentId: nullable(formData, "parentId"),
      active: bool(formData, "active"),
    });
  if (id && data.parentId === id)
    throw new Error("A category cannot be its own parent.");
  const record = id
    ? await database.category.update({ where: { id: safeId.parse(id) }, data })
    : await database.category.create({ data });
  await database.adminAuditLog.create({
    data: {
      staffUserId: staff.id,
      action: id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
      entityType: "Category",
      entityId: record.id,
      summary: `Category ${id ? "updated" : "created"}: ${record.name}`,
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath(`/categories/${record.slug}`);
}

export async function queueSupplierSync(supplierId: string, formData: FormData) {
  const staff = await requireStaff("suppliers:write");
  const id = safeId.parse(supplierId);
  const syncType = z.enum(["FULL", "PRODUCTS_INCREMENTAL", "STOCK_PRICES_INCREMENTAL"]).parse(formData.get("syncType"));
  if (syncType === "FULL" && formData.get("confirmed") !== "yes") throw new Error("Full sync confirmation is required.");
  const supplier = await database.supplier.findUnique({ where: { id }, select: { slug: true } });
  if (supplier?.slug !== "premium-apparel") throw new Error("Sync controls are not configured for this supplier.");
  const run = await queuePremiumApparelSync(syncType, "MANUAL", staff.id);
  await database.adminAuditLog.create({ data: { staffUserId: staff.id, action: "SUPPLIER_SYNC_QUEUED", entityType: "SupplierSyncRun", entityId: run.id, summary: `${syncType} supplier sync queued` } });
  revalidatePath(`/admin/suppliers/${id}`);
  revalidatePath(`/admin/suppliers/${id}/syncs`);
}
