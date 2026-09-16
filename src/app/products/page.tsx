import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedProducts } from "../../catalogue/customer.ts";
import { filterAndSortProducts } from "../../catalogue/discovery.ts";
import { getCatalogueRange } from "../../catalogue/ranges.ts";
import { ProductGrid } from "../../components/product-card.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop Apparel | CXA", description: "Browse quality apparel and merchandise ready for custom branding by CXA.", alternates: { canonical: "/products" } };

type Option = { label: string; value: string };
export default async function ProductsPage(props: PageProps<"/products">) {
  const params = await props.searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const query = value("q").trim();
  const range = value("range"); const selectedRange = getCatalogueRange(range);
  const category = value("category"); const brand = value("brand"); const method = value("method");
  const availability = value("availability"); const sort = value("sort") || "featured";
  const allProducts = await listPublishedProducts();
  const rangeProducts = range ? filterAndSortProducts(allProducts, { range }) : allProducts;
  const categories = [...new Map(rangeProducts.filter(p => p.category && p.categorySlug).map(p => [p.categorySlug!, { label: p.category!, value: p.categorySlug! }])).values()];
  const brands = [...new Map(rangeProducts.filter(p => p.brand && p.brandSlug).map(p => [p.brandSlug!, { label: p.brand!, value: p.brandSlug! }])).values()];
  const products = filterAndSortProducts(allProducts, { availability, brand, category, range, method, query, sort });
  const filters = { availability, brand, brands, categories, category, range, method, query };

  return <main className="page-shell shell catalogue-page">
    <header className="page-heading catalogue-heading"><div><h1>{selectedRange?.name ?? "Shop apparel"}</h1><p>Quality blank apparel ready for your logo, team or event.</p></div><span>{products.length} {products.length === 1 ? "product" : "products"}</span></header>
    {selectedRange && <Link className="range-back-link" href="/products">← Browse all apparel</Link>}
    <form className="catalogue-toolbar">{range && <input name="range" type="hidden" value={range} />}
      <div><label className="sr-only" htmlFor="catalogue-search">Search catalogue</label><input defaultValue={query} id="catalogue-search" name="q" placeholder="Search products..." /></div>
      {category ? <input name="category" type="hidden" value={category} /> : null}{brand ? <input name="brand" type="hidden" value={brand} /> : null}{method ? <input name="method" type="hidden" value={method} /> : null}{availability ? <input name="availability" type="hidden" value={availability} /> : null}
      <label>Sort by<select defaultValue={sort} name="sort"><option value="featured">Featured</option><option value="newest">Newest</option><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option></select></label><button className="primary-button" type="submit">Apply</button>
    </form>
    <details className="mobile-filter"><summary>Filter products</summary><FilterForm {...filters} /></details>
    <div className="catalogue-layout"><FilterForm {...filters} /><section aria-label="Products">{products.length ? <ProductGrid products={products} /> : <div className="empty-state"><span className="empty-icon" aria-hidden="true">⌕</span><h2>No products match your filters</h2><p>Try changing your search or clearing the filters.</p><Link className="primary-button" href={range ? `/products?range=${encodeURIComponent(range)}` : "/products"}>Clear filters</Link></div>}</section></div>
  </main>;
}

function FilterForm(props: { availability:string; brand:string; brands:Option[]; categories:Option[]; category:string; range:string; method:string; query:string }) {
  return <form className="filter-panel">{props.range && <input name="range" type="hidden" value={props.range} />}<h2>Filter products</h2><input name="q" type="hidden" value={props.query} /><FilterGroup label="Category" name="category" options={props.categories} selected={props.category} /><FilterGroup label="Brand" name="brand" options={props.brands} selected={props.brand} /><FilterGroup label="Decoration" name="method" options={["Screen Print","Embroidery","DTF"].map(value => ({label:value,value}))} selected={props.method} /><FilterGroup label="Availability" name="availability" options={[{label:"In stock",value:"IN_STOCK"},{label:"Low stock",value:"LOW_STOCK"}]} selected={props.availability} /><button className="primary-button" type="submit">Apply filters</button><Link href={props.range ? `/products?range=${encodeURIComponent(props.range)}` : "/products"}>Clear filters</Link></form>;
}
function FilterGroup({ label, name, options, selected }: { label:string; name:string; options:Option[]; selected:string }) {
  return <fieldset><legend>{label}</legend><label><input defaultChecked={!selected} name={name} type="radio" value="" /> All</label>{options.map(option => <label key={option.value}><input defaultChecked={selected === option.value} name={name} type="radio" value={option.value} /> {option.label}</label>)}</fieldset>;
}


