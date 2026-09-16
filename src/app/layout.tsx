import type { Metadata } from "next";
import { SITE_URL } from "../lib/site.ts";
import { SiteFooter } from "../components/site-footer.tsx";
import { SiteHeader } from "../components/site-header.tsx";
import { QuoteCartProvider } from "../components/quote-cart-provider.tsx";
import "./globals.css";
import "./launch.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "CXA | Custom X Apparel", template: "%s" },
  description: "Custom apparel and merchandise for New Zealand businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html data-scroll-behavior="smooth" lang="en-NZ">
      <body>
        <QuoteCartProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </QuoteCartProvider>
      </body>
    </html>
  );
}
