import assert from "node:assert/strict";
import { test } from "node:test";

import { toPublicAvailability } from "../src/catalogue/availability.ts";
import { selectPublicImages } from "../src/catalogue/images.ts";
import {
  sanitizeSupplierHtml,
  supplierContentToPlainText,
} from "../src/catalogue/sanitize.ts";

test("availability thresholds never return exact quantities", () => {
  assert.equal(toPublicAvailability(-1), "OUT_OF_STOCK");
  assert.equal(toPublicAvailability(0), "OUT_OF_STOCK");
  assert.equal(toPublicAvailability(1), "LOW_STOCK");
  assert.equal(toPublicAvailability(10), "LOW_STOCK");
  assert.equal(toPublicAvailability(11), "IN_STOCK");
});

test("supplier HTML sanitizer removes executable and unknown markup", () => {
  const dirty = `<p onclick="steal()">Safe <strong>copy</strong></p>
    <script>alert(1)</script><style>body{display:none}</style>
    <iframe src="https://evil.example"></iframe><form><input autofocus onfocus="steal()"></form>
    <table data-secret="x"><tr><td>Size</td></tr></table>`;
  const clean = sanitizeSupplierHtml(dirty);

  assert.match(clean, /<p>Safe <strong>copy<\/strong><\/p>/);
  assert.match(clean, /<table><tr><td>Size<\/td><\/tr><\/table>/);
  assert.doesNotMatch(clean, /script|style|iframe|form|input|onclick|onfocus|data-secret|evil/i);
});

test("supplier description converts to plain text", () => {
  const plain = supplierContentToPlainText(
    null,
    "<p>Soft <em>cotton</em>.</p><script>secret()</script>",
  );
  assert.equal(plain, "Soft cotton.");
});

test("image selection deduplicates and follows primary, hero, colour hierarchy", () => {
  const primary = "/images/cxa-primary.jpg";
  const hero = "https://ik.imagekit.io/premiumapparel/hero.jpg";
  const colour = "https://ik.imagekit.io/premiumapparel/colour.jpg";
  assert.deepEqual(
    selectPublicImages(primary, [
      { kind: "COLOUR", url: colour, sortOrder: 0 },
      { kind: "HERO", url: hero, sortOrder: 1 },
      { kind: "HERO", url: hero, sortOrder: 0 },
      { kind: "COLOUR", url: "https://evil.example/not-allowed.jpg" },
      { kind: "COLOUR", url: "" },
    ]),
    [primary, hero, colour],
  );
  assert.equal(
    selectPublicImages(null, [{ kind: "COLOUR", url: colour }])[0],
    colour,
  );
});
