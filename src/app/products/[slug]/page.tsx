import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getPublishedProductBySlug } from "../../../catalogue/customer.ts";
import { ProductConfigurator } from "../../../components/product-configurator.tsx";
import { Breadcrumbs, breadcrumbJsonLd } from "../../../components/breadcrumbs.tsx";
import { JsonLd } from "../../../components/json-ld.tsx";
import { publicUrl } from "../../../lib/site.ts";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Product not found | CXA" };

  const description =
    product.description?.slice(0, 155) ||
    `Explore ${product.name} for custom decoration from CXA.`;

  return {
    title: `${product.name} | CXA`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | CXA`,
      description,
      type: "website",
    },
  };
}

export default async function ProductDetailPage(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const editQuoteLineId =
    typeof searchParams.edit === "string" ? searchParams.edit : undefined;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const decorations = [
    product.decorations.screenPrint && "Screen print",
    product.decorations.embroidery && "Embroidery",
    product.decorations.dtf && "DTF",
  ].filter(Boolean) as string[];

  return (
    <main className="page-shell shell product-detail">
      <JsonLd value={{ "@context":"https://schema.org", "@type":"Product", name:product.name, description:product.description ?? undefined, image:product.galleryImages, brand:product.brand ? {"@type":"Brand",name:product.brand}:undefined, category:product.category ?? undefined, url:publicUrl(`/products/${product.slug}`) }} />
      <JsonLd value={breadcrumbJsonLd([{name:"Home",url:publicUrl("/")},{name:"Products",url:publicUrl("/products")},{name:product.name,url:publicUrl(`/products/${product.slug}`)}])} />
      <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Shop apparel",href:"/products"},{label:product.name}]} />
      <section className="product-workspace">
        <div className="gallery">
          <div className="main-image">
            {product.primaryImage ? (
              <Image
                alt={product.name}
                fill
                priority
                sizes="(max-width: 800px) 100vw, 55vw"
                src={product.primaryImage}
                unoptimized
              />
            ) : (
              <span>No image available</span>
            )}
          </div>
          {product.galleryImages.length > 1 ? (
            <div className="gallery-strip">
              {product.galleryImages.slice(0, 6).map((image, index) => (
                <div className="thumbnail" key={image}>
                  <Image
                    alt={`${product.name} view ${index + 1}`}
                    fill
                    sizes="96px"
                    src={image}
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="product-buy-panel">
        <div className="product-summary">
          
          <h1>{product.name}</h1>
          {product.category ? <p className="brand-line">{product.category}</p> : null}
          {product.description ? <p className="lead">{product.description}</p> : null}
          <h2>Available branding</h2>
          <div className="tag-row">
            {decorations.map((decoration) => (
              <span className="tag" key={decoration}>{decoration}</span>
            ))}
          </div>
        </div>
        <ProductConfigurator editQuoteLineId={editQuoteLineId} product={product} />
        </div>
      </section>

      {product.sizeChartHtml ? (
        <section className="size-chart">
          <h2>Size guide</h2>
          <div dangerouslySetInnerHTML={{ __html: product.sizeChartHtml }} />
        </section>
      ) : null}
    </main>
  );
}
