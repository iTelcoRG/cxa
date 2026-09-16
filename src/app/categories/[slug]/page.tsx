import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveCategory, listPublishedProducts } from "../../../catalogue/customer.ts";
import { Breadcrumbs, breadcrumbJsonLd } from "../../../components/breadcrumbs.tsx";
import { JsonLd } from "../../../components/json-ld.tsx";
import { ProductGrid } from "../../../components/product-card.tsx";
import { publicUrl } from "../../../lib/site.ts";

export const dynamic = "force-dynamic";
export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params; const category = await getActiveCategory(slug);
  if (!category) return { title: "Category not found | CXA" };
  const description = category.description ?? `Browse ${category.name.toLowerCase()} ready for custom printing and branding by CXA.`;
  return { title: `${category.name} | CXA`, description, alternates: { canonical: `/categories/${slug}` }, openGraph: { title: `${category.name} | CXA`, description, type: "website" } };
}
export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params; const category = await getActiveCategory(slug); if (!category) notFound();
  const included = new Set([category.slug, ...category.children.map(child => child.slug)]);
  const products = (await listPublishedProducts()).filter(product => product.categorySlug && included.has(product.categorySlug));
  const crumbs = [{ label: "Home", href: "/" }, ...(category.parent ? [{ label: category.parent.name, href: `/categories/${category.parent.slug}` }] : []), { label: category.name }];
  return <main className="page-shell shell"><JsonLd value={breadcrumbJsonLd(crumbs.map(item => ({ name:item.label, url:publicUrl(item.href ?? `/categories/${category.slug}`) })))} /><Breadcrumbs items={crumbs} />
    <header className="page-heading discovery-heading"><h1>{category.name}</h1><p>{category.description ?? "Explore CXA apparel and merchandise ready to customise for your team, business or event."}</p></header>
    {category.children.length ? <nav aria-label={`${category.name} subcategories`} className="subcategories">{category.children.map(child => <Link href={`/categories/${child.slug}`} key={child.slug}>{child.name}</Link>)}</nav> : null}
    {products.length ? <ProductGrid products={products} /> : <section className="empty-state"><span className="empty-icon" aria-hidden="true">◇</span><h2>No published products here yet</h2><p>Browse the full CXA range while this category is being prepared.</p><Link className="primary-button" href="/products">Browse products</Link></section>}
  </main>;
}
