import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("customer navigation exposes accessible mobile and quote states", async () => {
  const [header, cartLink] = await Promise.all([
    read("src/components/site-header.tsx"),
    read("src/components/quote-cart-link.tsx"),
  ]);
  assert.match(header, /aria-expanded=\{open\}/);
  assert.match(header, /aria-controls="mobile-navigation"/);
  assert.match(header, /role="search"/);
  const expectedLinks = [["Create Your Brand", "/create-your-brand"], ["Catalogue", "/products"], ["Branding", "/printing-embroidery"], ["How it works", "/how-it-works"], ["About us", "/about"], ["Contact", "/contact"]];
  const navigation = JSON.parse(header.match(/const navigation = (\[.*\]) as const;/)![1]);
  assert.deepEqual(navigation, expectedLinks);
  assert.equal((header.match(/aria-current=/g) ?? []).length, 2, "Both menus announce the current destination");
  assert.match(cartLink, /garmentTotal/);
  assert.match(cartLink, /cart\.lines\.length/);
});

test("homepage carousel and navigation controls have accessible names", async () => {
  const slider = await read("src/components/hero-slider.tsx");
  assert.match(slider, /aria-roledescription="carousel"/);
  assert.match(slider, /aria-label="Previous campaign"/);
  assert.match(slider, /aria-label="Next campaign"/);
  assert.match(slider, /aria-pressed=\{index === current\}/);
});

test("customer UI includes polished empty and error announcement states", async () => {
  const [products, cart, form] = await Promise.all([
    read("src/app/products/page.tsx"),
    read("src/components/quote-cart-page.tsx"),
    read("src/components/quote-submission-form.tsx"),
  ]);
  assert.match(products, /No products match your filters/);
  assert.match(cart, /Your quote cart is empty/);
  assert.match(form, /role="alert"/);
  assert.match(form, /submitting \? "Submitting quote/);
});

test("design tokens and reduced-motion behavior are centralized", async () => {
  const css = await read("src/app/globals.css");
  for (const token of ["--cxa-blue", "--cxa-black", "--cxa-border", "--control", "--shell"]) {
    assert.match(css, new RegExp(token));
  }
  assert.match(css, /prefers-reduced-motion:reduce/);
});
