import "server-only";

import { database } from "../lib/database.ts";
import {
  toPublicAvailability,
  type PublicAvailability,
} from "./availability.ts";
import { selectPublicImages } from "./images.ts";
import { sanitizeSupplierHtml } from "./sanitize.ts";
import { resolvePublicDescription } from "./description.ts";

export interface PublicDecorationMethods {
  dtf: boolean;
  embroidery: boolean;
  screenPrint: boolean;
}

export interface PublicProductColour {
  code: string;
  description: string;
  images: string[];
  variants: Array<{
    availability: PublicAvailability;
    size: string;
  }>;
}

export interface PublicProduct {
  brand: string | null;
  brandSlug?: string | null;
  category: string | null;
  categorySlug?: string | null;
  colours: PublicProductColour[];
  decorations: PublicDecorationMethods;
  description: string | null;
  createdAt?: string;
  featured: boolean;
  galleryImages: string[];
  id: string;
  name: string;
  newProduct: boolean;
  primaryImage: string | null;
  sizeChartHtml: string;
  slug: string;
  status: "PUBLISHED";
}

const publicProductSelection = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  createdAt: true,
  description: true,
  dtf: true,
  embroidery: true,
  featured: true,
  id: true,
  name: true,
  newProduct: true,
  primaryImage: true,
  screenPrint: true,
  slug: true,
  status: true,
  supplierLinks: {
    where: { preferredSupplier: true },
    take: 1,
    select: {
      supplierProduct: {
        select: {
          sizeChart: true,
          textDescription: true,
          htmlDescription: true,
          images: {
            orderBy: { sortOrder: "asc" as const },
            select: {
              kind: true,
              sortOrder: true,
              url: true,
              supplierColour: { select: { colourCode: true } },
            },
          },
          colours: {
            orderBy: { colourDescription: "asc" as const },
            select: {
              colourCode: true,
              colourDescription: true,
              images: {
                orderBy: { sortOrder: "asc" as const },
                select: { kind: true, sortOrder: true, url: true },
              },
              variants: {
                where: { active: true },
                orderBy: { size: "asc" as const },
                select: { size: true, stock: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

type SelectedProduct = Awaited<
  ReturnType<typeof findSelectedPublishedProduct>
>;

async function findSelectedPublishedProduct(slug: string) {
  return database.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: publicProductSelection,
  });
}

function toPublicProduct(product: NonNullable<SelectedProduct>): PublicProduct {
  const supplierProduct = product.supplierLinks[0]?.supplierProduct;
  const sources =
    supplierProduct?.images.map((image) => ({
      colourCode: image.supplierColour?.colourCode,
      kind: image.kind,
      sortOrder: image.sortOrder,
      url: image.url,
    })) ?? [];
  const galleryImages = selectPublicImages(product.primaryImage, sources);

  return {
    brand: product.brand?.name ?? null,
    brandSlug: product.brand?.slug ?? null,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    colours:
      supplierProduct?.colours.map((colour) => ({
        code: colour.colourCode,
        description: colour.colourDescription,
        images: selectPublicImages(null, colour.images),
        variants: colour.variants.map((variant) => ({
          availability: toPublicAvailability(variant.stock),
          size: variant.size,
        })),
      })) ?? [],
    decorations: {
      dtf: product.dtf,
      embroidery: product.embroidery,
      screenPrint: product.screenPrint,
    },
    description: resolvePublicDescription(
      product.description,
      supplierProduct?.textDescription,
      supplierProduct?.htmlDescription,
    ),
    createdAt: product.createdAt.toISOString(),
    featured: product.featured,
    galleryImages,
    id: product.id,
    name: product.name,
    newProduct: product.newProduct,
    primaryImage: galleryImages[0] ?? null,
    sizeChartHtml: sanitizeSupplierHtml(supplierProduct?.sizeChart),
    slug: product.slug,
    status: "PUBLISHED",
  };
}

export interface PublicBrand { name: string; slug: string; description: string | null; productCount: number; }
export interface PublicCategory { name: string; slug: string; description: string | null; parent: { name: string; slug: string } | null; children: Array<{ name: string; slug: string }>; productCount: number; }

export async function listActiveBrands(): Promise<PublicBrand[]> {
  const brands = await database.brand.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { name: true, slug: true, description: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } } });
  return brands.map(brand => ({ name: brand.name, slug: brand.slug, description: brand.description, productCount: brand._count.products }));
}

export async function getActiveBrand(slug: string): Promise<PublicBrand | null> {
  const brand = await database.brand.findFirst({ where: { active: true, slug }, select: { name: true, slug: true, description: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } } });
  return brand ? { name: brand.name, slug: brand.slug, description: brand.description, productCount: brand._count.products } : null;
}

export async function listActiveCategories(): Promise<PublicCategory[]> {
  const categories = await database.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { name: true, slug: true, description: true, parent: { select: { name: true, slug: true } }, children: { where: { active: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } }, _count: { select: { products: { where: { status: "PUBLISHED" } } } } } });
  return categories.map(category => ({ name: category.name, slug: category.slug, description: category.description, parent: category.parent, children: category.children, productCount: category._count.products }));
}

export async function getActiveCategory(slug: string): Promise<PublicCategory | null> {
  return (await listActiveCategories()).find(category => category.slug === slug) ?? null;
}

export async function listPublishedProducts(): Promise<PublicProduct[]> {
  const products = await database.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { name: "asc" },
    select: publicProductSelection,
  });

  return products.map(toPublicProduct);
}

export async function getPublishedProductBySlug(
  slug: string,
): Promise<PublicProduct | null> {
  const product = await findSelectedPublishedProduct(slug);
  return product ? toPublicProduct(product) : null;
}
