"use client";
import Link from "next/link";
import { useQuoteCart } from "./quote-cart-provider.tsx";
export function QuoteCartLink() {
  const { cart, garmentTotal, hydrated } = useQuoteCart();
  const count = hydrated ? cart.lines.length : 0;
  return <Link className="quote-cart-link" href="/quote" aria-label={`Quote Cart, ${garmentTotal} garments`}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 5h2l2.2 9.2a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 1.9-1.4L21 8H7" /><circle cx="10" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></svg>
    <span>Quote Cart</span><strong>{count}</strong>
  </Link>;
}
