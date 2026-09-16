import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listActiveBrands } from "../catalogue/customer.ts";
import { JsonLd } from "../components/json-ld.tsx";
import { brandLogos } from "../catalogue/brand-logos.ts";
import { ApparelCategoryGrid } from "../components/apparel-category-grid.tsx";
import { publicUrl } from "../lib/site.ts";
import { featuredTechniques } from "../content/decoration-techniques.ts";
import { DecorationTechniqueCard } from "../components/decoration-technique-card.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Custom Apparel & Merchandise NZ | CXA", description: "Premium custom apparel, workwear and merchandise with screen printing, embroidery and heat transfer from CXA.", alternates: { canonical: "/" } };
const steps = [["Choose apparel", "Pick your garment, colour and sizes."], ["Add your design", "Upload your artwork and choose your branding positions."], ["Get your quote", "We’ll review the details and prepare your quote."], ["We create & deliver", "Approve your quote and artwork, then we bring it to life."]] as const;
function StepIcon({ step }: { step: number }) {
  const paths = ["M9 4 4 7 1 13l5 3 2-4v16h16V12l2 4 5-3-3-6-5-3c-1 5-13 5-14 0Z", "M9 23H6a5 5 0 0 1-1-10A10 10 0 0 1 24 9a7 7 0 0 1 2 14h-3M16 29V13m-6 6 6-6 6 6", "M7 3h14l5 5v21H7ZM21 3v6h5M11 14h11m-11 5h11m-11 5h7", "M2 7h18v17H2ZM20 13h6l5 7v4H20M6 24a3 3 0 1 0 6 0m11 0a3 3 0 1 0 6 0"];
  return <svg aria-hidden="true" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d={paths[step]} /></svg>;
}
export default async function Home() {
  const brands = (await listActiveBrands()).filter(brand => brand.productCount > 0 && brandLogos[brand.slug]);
  return <main className="premium-home launch-home">
    <JsonLd value={{ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", name: "Custom X Apparel", email: "sales@cxa.co.nz", url: publicUrl("/") }, { "@type": "WebSite", name: "CXA | Custom X Apparel", url: publicUrl("/") }] }} />
    <section className="launch-hero" aria-labelledby="hero-title">
      <div className="shell launch-hero-grid">
        <div className="launch-hero-copy"><h1 id="hero-title">Bring your<br /><em>brand</em><br />to life.</h1></div>
        <div className="launch-hero-art"><div className="garment-halo" aria-hidden="true" /><Image src="/images/cxa-hoodie-hero.png" alt="Black CXA hoodie with chest and sleeve branding" width={1145} height={1374} preload sizes="(max-width: 760px) 95vw, 55vw" className="launch-hoodie" /></div>
        <div className="launch-hero-details">
          <p className="hero-intro">Premium clothing. Expert printing and embroidery. No online payment, just tailored quotes.</p>
          <div className="button-row"><Link className="primary-button" href="/create-your-brand">Start designing <span aria-hidden="true">→</span></Link><Link className="secondary-button" href="/products">Browse apparel</Link></div>
          <ul className="hero-services" aria-label="Branding options"><li>Screen printing</li><li>Embroidery</li><li>Heat transfer</li></ul>
        </div>
      </div>
    </section>
    <section className="launch-steps"><div className="shell launch-steps-grid"><header><h2>From idea to finished apparel.</h2></header><ol>{steps.map(([title, copy], index) => <li key={title}><StepIcon step={index} /><div><span className="step-number">{index + 1}</span><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></div></section>
    <section className="section shell launch-categories">
      <div className="section-heading"><div><h2>Start with the right base.</h2></div><Link className="text-link" href="/products">Browse all apparel →</Link></div>
      <ApparelCategoryGrid />
    </section>
    <section className="launch-methods"><div className="shell"><div className="section-heading"><div><h2>Your brand, beautifully applied.</h2></div></div><div className="launch-method-grid">{featuredTechniques.map(technique => <DecorationTechniqueCard key={technique.slug} technique={technique} />)}</div><Link className="text-link decoration-view-all" href="/printing-embroidery">View all decoration techniques <span aria-hidden="true">→</span></Link></div></section>
    {brands.length > 0 && <section className="launch-brands shell" aria-label="Brands we supply"><div>{brands.map(brand => <Link href={`/brands/${brand.slug}`} key={brand.slug} aria-label={`Shop ${brand.name}`}><Image src={brandLogos[brand.slug]} alt={brand.name} width={180} height={80} className="supplier-brand-logo" /></Link>)}</div></section>}
    <section className="launch-final"><div className="shell"><div><h2>Let’s make something<br />that’s yours.</h2></div><Link className="primary-button" href="/products">Start your quote <span aria-hidden="true">→</span></Link></div></section>
  </main>;
}
