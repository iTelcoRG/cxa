import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "../catalogue/customer.ts";
import { decorationLabels } from "../catalogue/discovery.ts";

export function ProductCard({ product, priority = false }: { product: PublicProduct; priority?: boolean }) {
  return <article className="product-card">
    <Link className="card-image" href={`/products/${product.slug}`}>{product.primaryImage ? <Image alt={product.name} fill priority={priority} sizes="(max-width: 650px) 100vw, (max-width: 1050px) 50vw, 33vw" src={product.primaryImage} unoptimized /> : <span>No image available</span>}{product.newProduct ? <span className="product-flag">New</span> : null}</Link>
    <div className="card-body"><p className="card-meta">{product.brand ?? "CXA apparel"}</p><h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2><p>{product.colours.length} colours available</p><div className="tag-row">{decorationLabels(product).map(label => <span className="tag" key={label}>{label}</span>)}</div><Link className="card-action" href={`/products/${product.slug}`}>Customise <span aria-hidden="true">→</span></Link></div>
  </article>;
}

export function ProductGrid({ products }: { products: PublicProduct[] }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} priority={index === 0} product={product} />)}</div>;
}
