import "./branding.css";
import type { Metadata } from "next";
import { BrandingGallery } from "../../components/branding-gallery.tsx";

export const metadata: Metadata = {
  title: "Explore Branding: Printing, Embroidery & Heat Transfer | CXA",
  description: "Explore screen printing, embroidery, heat transfer including DTF, and specialist apparel finishes with CXA.",
  alternates: { canonical: "/printing-embroidery" },
};

export default function BrandingPage() {
  return <main className="page-shell shell branding-guide">
    <header className="page-heading">
      <h1>Explore branding.</h1>
      <p>Printing, stitching and finishing touches that make apparel yours. Start with a technique, then we’ll help match it to your project.</p>
    </header>
    <p className="branding-suitability">Suitability depends on the garment, artwork, quantity and placement. We confirm the technique and finish when quoting.</p>
    <BrandingGallery />
  </main>;
}
