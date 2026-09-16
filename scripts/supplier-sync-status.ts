import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "./development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();

const { database } = await import("../src/lib/database.ts");

try {
  const supplier = await database.supplier.findUniqueOrThrow({ where: { slug: "premium-apparel" }, select: { id: true, name: true } });
  const [products, activeProducts, colours, variants, activeVariants, images, brands, categories, cxaProducts, publishedProducts, links, quotes, staff, cursors] = await Promise.all([
    database.supplierProduct.count({ where: { supplierId: supplier.id } }),
    database.supplierProduct.count({ where: { supplierId: supplier.id, active: true } }),
    database.supplierColour.count({ where: { supplierProduct: { supplierId: supplier.id } } }),
    database.supplierVariant.count({ where: { supplierId: supplier.id } }),
    database.supplierVariant.count({ where: { supplierId: supplier.id, active: true } }),
    database.supplierImage.count({ where: { supplierProduct: { supplierId: supplier.id } } }),
    database.supplierProduct.groupBy({ by: ["supplierBrand"], where: { supplierId: supplier.id } }),
    database.supplierProduct.groupBy({ by: ["supplierCategory"], where: { supplierId: supplier.id } }),
    database.product.count(), database.product.count({ where: { status: "PUBLISHED" } }),
    database.productSupplier.count({ where: { supplierProduct: { supplierId: supplier.id } } }),
    database.quote.count(), database.staffUser.count({ where: { active: true } }),
    database.supplierSyncState.findMany({ where: { supplierId: supplier.id }, orderBy: { resource: "asc" }, select: { resource: true, status: true, lastSuccessfulCursor: true } }),
  ]);
  console.log(JSON.stringify({ supplier: supplier.name, products, activeProducts, inactiveProducts: products - activeProducts, colours, variants, activeVariants, inactiveVariants: variants - activeVariants, images, sourceBrandCount: brands.length, sourceCategoryCount: categories.length, cxaProducts, publishedProducts, supplierLinks: links, quotes, activeStaff: staff, cursors }, null, 2));
} finally { await database.$disconnect(); }
