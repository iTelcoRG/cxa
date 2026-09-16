import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveBrand, listPublishedProducts } from "../../../catalogue/customer.ts";
import { Breadcrumbs, breadcrumbJsonLd } from "../../../components/breadcrumbs.tsx";
import { JsonLd } from "../../../components/json-ld.tsx";
import { ProductGrid } from "../../../components/product-card.tsx";
import { publicUrl } from "../../../lib/site.ts";
export const dynamic = "force-dynamic";
export async function generateMetadata(props: PageProps<"/brands/[slug]">): Promise<Metadata> { const {slug}=await props.params; const brand=await getActiveBrand(slug); if(!brand)return{title:"Brand not found | CXA"}; const description=brand.description??`Browse ${brand.name} apparel available for custom branding through CXA.`; return {title:`${brand.name} Apparel | CXA`,description,alternates:{canonical:`/brands/${slug}`},openGraph:{title:`${brand.name} Apparel | CXA`,description,type:"website"}}; }
export default async function BrandPage(props: PageProps<"/brands/[slug]">) { const {slug}=await props.params; const brand=await getActiveBrand(slug); if(!brand)notFound(); const products=(await listPublishedProducts()).filter(product=>product.brandSlug===brand.slug); const crumbs=[{label:"Home",href:"/"},{label:"Brands",href:"/brands"},{label:brand.name}]; return <main className="page-shell shell"><JsonLd value={breadcrumbJsonLd(crumbs.map(item=>({name:item.label,url:publicUrl(item.href??`/brands/${brand.slug}`)})))} /><Breadcrumbs items={crumbs}/><header className="page-heading discovery-heading"><h1>{brand.name}</h1><p>{brand.description??`Browse published ${brand.name} styles ready to configure with CXA branding.`}</p></header>{products.length?<ProductGrid products={products}/>:<section className="empty-state"><h2>No published products yet</h2><p>This brand is active, but its customer catalogue is still being prepared.</p><Link className="primary-button" href="/products">Browse products</Link></section>}</main>; }
