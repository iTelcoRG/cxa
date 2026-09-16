"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { QuoteCartLink } from "./quote-cart-link.tsx";
const navigation = [["Create Your Brand", "/create-your-brand"], ["Catalogue", "/products"], ["Branding", "/printing-embroidery"], ["How it works", "/how-it-works"], ["About us", "/about"], ["Contact", "/contact"]] as const;
export function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => document.documentElement.style.setProperty('--cxa-header-height', header.getBoundingClientRect().height + 'px');
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--cxa-header-height'); };
  }, []);
 const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const query = String(new FormData(event.currentTarget).get("q") ?? "").trim(); router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products"); setOpen(false); setSearchOpen(false); } return <header ref={headerRef} className="site-header"><div className="shell header-main"><Link className="brand-logo" href="/" aria-label="Custom X Apparel home"><Image alt="Custom X Apparel" priority src="/brand/CXA_Logo_Upright_White_v1.svg" width={1304} height={410}/></Link><nav aria-label="Primary navigation" className="desktop-primary-nav">{navigation.map(([label, href]) => <Link aria-current={pathname === href ? "page" : undefined} href={href} key={label}>{label}</Link>)}</nav><div className="header-actions"><button aria-controls="header-search-panel" aria-expanded={searchOpen} className="search-toggle" onClick={() => { setSearchOpen((value) => !value); setOpen(false); }} type="button"><span aria-hidden="true">⌕</span><span className="sr-only">Search products</span></button><QuoteCartLink/><Link className="header-quote-cta" href="/products">GET A QUOTE</Link><button aria-controls="mobile-navigation" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} className="menu-button" onClick={() => { setOpen((value) => !value); setSearchOpen(false); }} type="button"><span/><span/><span/></button></div></div><div className="header-search-panel" data-open={searchOpen} id="header-search-panel"><form className="shell" onSubmit={search} role="search"><label htmlFor="site-search">SEARCH THE CXA CATALOGUE</label><div><input autoComplete="off" id="site-search" name="q" placeholder="Products, brands, categories…"/><button type="submit">SEARCH</button></div></form></div><nav aria-label="Mobile navigation" className="mobile-navigation" data-open={open} id="mobile-navigation"><div className="shell">{navigation.map(([label, href]) => <Link aria-current={pathname === href ? "page" : undefined} href={href} key={label} onClick={() => setOpen(false)}>{label}</Link>)}</div></nav></header>; }

