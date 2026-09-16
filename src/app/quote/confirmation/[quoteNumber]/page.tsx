import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getSafeQuoteConfirmation } from "../../../../quotes/confirmation.ts";

export const metadata: Metadata = {
  title: "Quote received | CXA",
  robots: { index: false, follow: false },
};

export default async function QuoteConfirmationPage(
  props: PageProps<"/quote/confirmation/[quoteNumber]">,
) {
  await connection();
  const [{ quoteNumber }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const confirmation = await getSafeQuoteConfirmation(quoteNumber, token);
  if (!confirmation) notFound();

  return (
    <main className="page-shell shell confirmation-page">
      <div className="success-mark" aria-hidden="true">✓</div>
      
      <h1>Thanks, we&apos;ve received your quote request.</h1>
      <div className="confirmation-number"><span>Quote</span><strong>{confirmation.quoteNumber}</strong></div>
      <p className="confirmation-intro">
        Thank you, {confirmation.customerName.split(" ")[0]}. Your request was submitted on{" "}
        {new Intl.DateTimeFormat("en-NZ", { dateStyle: "long", timeZone: "Pacific/Auckland" }).format(
          new Date(confirmation.submittedAt),
        )}.
      </p>
      <div className="confirmation-summary">
        <div><strong>{confirmation.configurationCount}</strong><span>Configurations</span></div>
        <div><strong>{confirmation.totalGarments}</strong><span>Total garments</span></div>
      </div>
      <h2>Request summary</h2>
      <ul className="confirmation-products">
        {confirmation.products.map((product, index) => (
          <li key={`${product.productName}-${product.colourDescription}-${index}`}>
            <strong>{product.productName}</strong>
            <span>{product.colourDescription} · {product.totalQuantity} garments</span>
          </li>
        ))}
      </ul>
      {confirmation.artwork.length ? <section className="confirmation-artwork"><h2>Artwork received</h2><ul>{confirmation.artwork.map((file, index) => <li key={`${file.originalFileName}-${index}`}>{file.originalFileName}</li>)}</ul></section> : null}
      <div className="confirmation-message">
        <h2>What happens next?</h2>
        <ul><li>We&apos;ll review product availability.</li><li>Branding and artwork requirements will be confirmed.</li><li>Your final pricing will follow.</li></ul>
        <p><strong>No payment has been taken.</strong></p>
      </div>
      <div className="button-row"><Link className="primary-button" href="/products">Browse more products</Link><Link className="secondary-button" href="/">Return home</Link></div>
    </main>
  );
}
