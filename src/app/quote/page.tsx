import type { Metadata } from "next";

import { QuoteCartPage } from "../../components/quote-cart-page.tsx";

export const metadata: Metadata = {
  title: "Quote Cart | CXA",
  description: "Review your configured CXA garments before requesting a quote.",
};

export default function QuotePage() {
  return (
    <main className="page-shell shell">
      <header className="page-heading">
        
        <h1>Build your quote</h1>
        <p>Review your configurations, then tell us where and when you need them.</p>
      </header>
      <QuoteCartPage />
    </main>
  );
}
