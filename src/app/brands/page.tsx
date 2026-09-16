import type { Metadata } from "next";
import Link from "next/link";
import { listActiveBrands } from "../../catalogue/customer.ts";
import { Breadcrumbs } from "../../components/breadcrumbs.tsx";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apparel Brands | CXA", description: "Browse active apparel brands available through the CXA catalogue.", alternates: { canonical: "/brands" } };
export default async function BrandsPage() {
  const brands = await listActiveBrands();
  return <main className="page-shell shell"><Breadcrumbs items={[{label:"Home",href:"/"},{label:"Brands"}]} /><header className="page-heading discovery-heading"><h1>Apparel brands</h1><p>Explore the active brands currently represented in the CXA customer catalogue.</p></header>
    <div className="brand-directory">{brands.map(brand => <Link href={`/brands/${brand.slug}`} key={brand.slug}><strong>{brand.name}</strong><span>{brand.productCount} published {brand.productCount === 1 ? "product" : "products"}</span><b aria-hidden="true">→</b></Link>)}</div>
  </main>;
}
