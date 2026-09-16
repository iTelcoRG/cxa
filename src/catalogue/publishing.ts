import "server-only";

import type { ProductStatus } from "../generated/prisma/enums.ts";
import { database } from "../lib/database.ts";
import { supplierContentToPlainText } from "./sanitize.ts";

export interface PublishSupplierProductInput {
  supplierProductId: string;
  status?: Extract<ProductStatus, "DRAFT" | "PUBLISHED">;
}

export interface PublishSupplierProductResult {
  created: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    status: ProductStatus;
  };
}

export function slugifyProductName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

export async function publishSupplierProductToCXA({
  supplierProductId,
  status,
}: PublishSupplierProductInput): Promise<PublishSupplierProductResult> {
  return database.$transaction(async (transaction) => {
    const supplierProduct = await transaction.supplierProduct.findUniqueOrThrow({
      where: { id: supplierProductId },
      select: {
        htmlDescription: true,
        supplierBrand: true,
        supplierCategory: true,
        supplierProductKey: true,
        supplierTitle: true,
        textDescription: true,
        catalogueLinks: {
          select: { product: { select: { id: true } } },
          take: 1,
        },
      },
    });

    const brandName = supplierProduct.supplierBrand.trim();
    const existingBrand = await transaction.brand.findFirst({
      where: { name: { equals: brandName, mode: "insensitive" } },
      select: { id: true },
    });
    const brand =
      existingBrand ??
      (await transaction.brand.upsert({
        where: { slug: slugifyProductName(brandName) },
        create: { name: brandName, slug: slugifyProductName(brandName) },
        update: { active: true },
        select: { id: true },
      }));

    const apparel = await transaction.category.upsert({
      where: { slug: "apparel" },
      create: { name: "Apparel", slug: "apparel" },
      update: { active: true },
      select: { id: true },
    });
    const categoryName =
      supplierProduct.supplierCategory.trim().toLowerCase() === "tanks"
        ? "Tanks"
        : supplierProduct.supplierCategory.trim() || "Other apparel";
    const category = await transaction.category.upsert({
      where: { slug: slugifyProductName(categoryName) },
      create: {
        name: categoryName,
        slug: slugifyProductName(categoryName),
        parentId: apparel.id,
      },
      update: { active: true },
      select: { id: true },
    });

    const linkedProductId = supplierProduct.catalogueLinks[0]?.product.id;
    const baseSlug = slugifyProductName(supplierProduct.supplierTitle);
    let created = false;
    let product;

    if (linkedProductId) {
      product = await transaction.product.update({
        where: { id: linkedProductId },
        data: status ? { status } : {},
        select: { id: true, name: true, slug: true, status: true },
      });
    } else {
      const slugOwner = await transaction.product.findUnique({
        where: { slug: baseSlug },
        select: { id: true },
      });
      const slug = slugOwner
        ? `${baseSlug}-${slugifyProductName(supplierProduct.supplierProductKey)}`
        : baseSlug;
      product = await transaction.product.create({
        data: {
          brandId: brand.id,
          categoryId: category.id,
          description: supplierContentToPlainText(
            supplierProduct.textDescription,
            supplierProduct.htmlDescription,
          ),
          dtf: true,
          embroidery: false,
          featured: false,
          name: supplierProduct.supplierTitle,
          newProduct: false,
          screenPrint: true,
          slug,
          status: status ?? "DRAFT",
        },
        select: { id: true, name: true, slug: true, status: true },
      });
      created = true;
    }

    await transaction.productSupplier.updateMany({
      where: { productId: product.id },
      data: { preferredSupplier: false },
    });
    await transaction.productSupplier.upsert({
      where: {
        productId_supplierProductId: {
          productId: product.id,
          supplierProductId,
        },
      },
      create: {
        preferredSupplier: true,
        productId: product.id,
        supplierProductId,
      },
      update: { preferredSupplier: true },
    });

    return { created, product };
  });
}
