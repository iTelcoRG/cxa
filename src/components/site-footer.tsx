import Image from "next/image";
import Link from "next/link";

const columns = [
  { title: "Shop", links: [["Create Your Brand","/create-your-brand"],["Catalogue","/products"],["Workwear","/products?category=workwear"],["Headwear","/products?category=headwear"],["Bags","/products?category=bags"],["Merchandise","/products?category=merchandise"]] },
  { title: "Information", links: [["Branding","/printing-embroidery"],["How it works","/how-it-works"],["Delivery","/delivery"],["FAQ","/faq"]] },
  { title: "Company", links: [["About us","/about"],["Contact","/contact"],["Terms & Conditions","/terms"],["Privacy Policy","/privacy"]] },
] as const;
export function SiteFooter() {
  return <footer className="site-footer" id="contact"><div className="shell footer-grid">
    <div className="footer-brand"><Link href="/" aria-label="Custom X Apparel home"><Image alt="Custom X Apparel" src="/brand/CXA_Logo_Upright_White_v1.svg" width={1304} height={410} /></Link><p>Quality apparel and merchandise, branded your way.</p><a href="mailto:sales@cxa.co.nz">sales@cxa.co.nz</a></div>
    {columns.map(column => <nav aria-label={column.title} key={column.title}><h2>{column.title}</h2>{column.links.map(([label,href]) => <Link href={href} key={label}>{label}</Link>)}</nav>)}
  </div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Custom X Apparel</span><span>Made for New Zealand teams</span></div></footer>;
}

