"use client";

import Image from "next/image";
import Link from "next/link";

import {
  decorationLocationLabel,
  decorationMethodLabel,
} from "../quote/definitions.ts";
import { useQuoteCart } from "./quote-cart-provider.tsx";
import { QuoteSubmissionForm } from "./quote-submission-form.tsx";

export function QuoteCartPage() {
  const { cart, clearCart, garmentTotal, hydrated, removeLine } = useQuoteCart();

  if (!hydrated) return <p className="cart-loading">Loading your quote cart…</p>;

  return (
    <>
      {cart.lines.length === 0 ? (
        <section className="empty-state">
          <span className="empty-icon" aria-hidden="true">◇</span>
          <h2>Your quote cart is empty</h2>
          <p>Choose an apparel style, colour, sizes and branding to get started.</p>
          <Link className="primary-button" href="/products">Browse apparel</Link>
        </section>
      ) : (
        <>
        <div className="quote-layout">
          <div className="quote-lines">
            {cart.lines.map((line, index) => (
              <article className="quote-line" key={line.quoteLineId}>
                <div className="quote-line-image">
                  {line.productImage ? (
                    <Image
                      alt={`${line.colourDescription} ${line.productName}`}
                      fill
                      priority={index === 0}
                      sizes="160px"
                      src={line.productImage}
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="quote-line-content">
                  <h2>{line.productName}</h2>
                  <div className="quote-colour"><span aria-hidden="true" /><strong>{line.colourDescription}</strong></div>
                  <dl className="line-details">
                    <div>
                      <dt>Sizes</dt>
                      <dd className="size-chips">{Object.entries(line.sizeQuantities).map(([size, quantity]) => <span key={size}>{size} <strong>× {quantity}</strong></span>)}</dd>
                    </div>
                    <div>
                      <dt>Total units</dt>
                      <dd>{line.totalGarmentQuantity}</dd>
                    </div>
                    <div>
                      <dt>Decoration</dt>
                      <dd>
                        <ul className="decoration-summary">
                          {line.decorations.map((selection) => (
                            <li key={selection.location}>
                              <strong>{decorationLocationLabel(selection.location)}</strong>
                              {` — ${decorationMethodLabel(selection.method)}`}
                              {selection.artwork ? <span>Artwork: {selection.artwork.originalFileName}</span> : null}
                              {selection.note ? <span>Note: {selection.note}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    {line.customerNotes ? (
                      <div><dt>General note</dt><dd>{line.customerNotes}</dd></div>
                    ) : null}
                  </dl>
                  <div className="line-actions">
                    <Link
                      className="secondary-button"
                      href={`/products/${line.productSlug}?edit=${encodeURIComponent(line.quoteLineId)}`}
                    >
                      Edit
                    </Link>
                    <button
                      className="text-button danger-button"
                      onClick={() => removeLine(line.quoteLineId)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="quote-summary">
            <h2>Quote summary</h2>
            <dl>
              <div><dt>Configurations</dt><dd>{cart.lines.length}</dd></div>
              <div><dt>Total garments</dt><dd>{garmentTotal}</dd></div>
            </dl>
            <a className="primary-button request-quote-button" href="#customer-details">
              Continue to details
            </a>
            <Link className="secondary-button continue-button" href="/products">
              Continue shopping
            </Link>
            <button
              className="text-button clear-button"
              onClick={() => {
                if (window.confirm("Clear every configuration from this quote?")) clearCart();
              }}
              type="button"
            >
              Clear quote
            </button>
          </aside>
        </div>
        <QuoteSubmissionForm lines={cart.lines} />
        </>
      )}
    </>
  );
}
