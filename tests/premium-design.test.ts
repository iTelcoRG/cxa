import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const css = await readFile("src/app/globals.css", "utf8");
const header = await readFile("src/components/site-header.tsx", "utf8");
const hero = await readFile("src/components/hoodie-scroll-experience.tsx", "utf8");
const tracker = await readFile("src/components/workflow-tracker.tsx", "utf8");
const home = await readFile("src/app/page.tsx", "utf8");
test("premium theme centralizes black, yellow and neutral tokens", () => { for (const token of ["--cxa-black", "--cxa-black-soft", "--cxa-charcoal", "--cxa-yellow", "--cxa-yellow-hover", "--cxa-off-white", "--cxa-border-dark"]) assert.match(css, new RegExp(token)); assert.doesNotMatch(home, /supplierPrice|rawData|storageKey/); });
test("mobile navigation exposes expanded and controlled semantics", () => { assert.match(header, /aria-expanded=\{open\}/); assert.match(header, /aria-controls="mobile-navigation"/); assert.match(header, /aria-label="Mobile navigation"/); assert.match(css, /@media\(max-width:767px\)/); });
test("hoodie interaction uses lightweight scroll progress with reduced-motion fallback", () => { assert.match(hero, /requestAnimationFrame/); assert.match(hero, /prefers-reduced-motion/); assert.match(hero, /max-width: 767px/); assert.doesNotMatch(hero, /three|webgl|canvas/i); assert.match(css, /@media\(prefers-reduced-motion:reduce\)/); });
test("garment preview only enables scroll sequencing with approved multiple images", () => { assert.match(hero, /images\.length > 1/); assert.match(hero, /approved rotation assets required/i); assert.match(hero, /LEFT CHEST/); assert.match(hero, /FULL BACK/); assert.match(hero, /RIGHT SLEEVE/); });
test("workflow tracker communicates state beyond colour", () => { assert.match(tracker, /aria-current/); assert.match(tracker, /Completed/); assert.match(tracker, /Current stage/); assert.match(tracker, /Not started/); });
test("premium homepage uses real catalogue data and contains no prices", () => { assert.match(home, /listPublishedProducts/); assert.match(home, /ProductCard/); assert.doesNotMatch(home, /\$\d|price/i); });
test("focus and table overflow remain accessible", () => { assert.match(css, /focus-visible/); assert.match(css, /admin-table-wrap[^}]*overflow-x:auto/); assert.match(css, /outline:3px solid var\(--cxa-yellow\)/); });

