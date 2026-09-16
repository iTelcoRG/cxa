import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allBrandingTechniques, techniqueContactHref } from "../src/content/decoration-techniques.ts";
import { subjectFromTechnique, ENQUIRY_SUBJECT_MAX_LENGTH } from "../src/contact/subject.ts";
import { buildEnquiryMessage, enquirySchema, submitEnquiry } from "../src/contact/enquiry.ts";
import { getCatalogueRange } from "../src/catalogue/ranges.ts";

const valid = { name: "Preview Customer", email: "preview@example.test", subject: "Account enquiry", message: "Please help with my existing account.", website: "" };

test("direct visits have no subject; all Branding CTA and legacy slugs map to canonical editable subjects", () => {
  assert.equal(subjectFromTechnique(undefined), "");
  for (const item of allBrandingTechniques) {
    const link = new URL(techniqueContactHref(item.slug), "https://cxa.co.nz");
    assert.equal(link.hash, "#contact-form");
    assert.equal(subjectFromTechnique(link.searchParams.get("technique")), `${item.title} enquiry`);
    assert.equal(subjectFromTechnique(item.slug), `${item.title} enquiry`);
  }
  for (const value of [null, "unknown", "<script>alert(1)</script>", "a".repeat(10000), ["embroidery", "dtg-printing"]]) assert.equal(subjectFromTechnique(value), "");
});

test("generic and freely edited technique subjects are trimmed and included in payload and email", async () => {
  for (const subject of ["Product question", "Account enquiry", "Follow-up on quote CXA-123", `${subjectFromTechnique("embroidery")} for our new jackets`]) {
    const result = await submitEnquiry({ ...valid, subject: `  ${subject}  ` }, async enquiry => {
      assert.equal(enquiry.subject, subject);
      assert.equal("technique" in enquiry, false);
      const email = buildEnquiryMessage(enquiry);
      assert.equal(email.subject, `CXA enquiry: ${subject}`);
      assert.ok(email.text.includes(`Subject: ${subject}`));
    });
    assert.equal(result.status, 200);
  }
});

test("subject is required, length bounded and rejects unsafe controls before trimming", () => {
  for (const subject of ["", "   ", "a".repeat(161), "\tAccount", "Account\r\nBcc: injected", "unsafe\0value", "unsafe\x7fvalue", "unsafe\u0085value", "unsafe\u2028value"]) {
    const parsed = enquirySchema.safeParse({ ...valid, subject });
    assert.equal(parsed.success, false, JSON.stringify(subject));
    if (!parsed.success) assert.ok(parsed.error.flatten().fieldErrors.subject?.length);
  }
  assert.equal(enquirySchema.safeParse({ ...valid, subject: "a".repeat(ENQUIRY_SUBJECT_MAX_LENGTH) }).success, true);
  const { subject: omitted, ...withoutSubject } = valid;
  assert.ok(omitted);
  assert.equal(enquirySchema.safeParse(withoutSubject).success, false);
});

test("validation and SMTP failures preserve the supplied subject and other values for retry", async () => {
  const input = { ...valid, subject: `${subjectFromTechnique("dtg-printing")} - edited` };
  const original = { ...input };
  const invalid = await submitEnquiry({ ...input, message: "short" }, async () => assert.fail("Invalid form reached SMTP"));
  assert.equal(invalid.status, 400);
  const failed = await submitEnquiry(input, async () => { throw new Error("Mock SMTP unavailable"); });
  assert.equal(failed.status, 503);
  assert.deepEqual(input, original);
  assert.equal(failed.body.success, undefined);
  assert.equal((await submitEnquiry(input, async () => {})).status, 200);
});

test("Contact presents an associated Subject input and the form before supporting email information", () => {
  const page = readFileSync("src/app/contact/page.tsx", "utf8");
  const form = readFileSync("src/components/contact-enquiry-form.tsx", "utf8");
  assert.ok(page.indexOf("<ContactEnquiryForm") < page.indexOf('className="contact-information"'));
  assert.doesNotMatch(page, /Ready to start|Browse apparel|contact-layout/);
  assert.equal((page.match(/<h1>/g) ?? []).length, 1);
  assert.match(form, /htmlFor="enquiry-subject"/);
  assert.match(form, /name="subject"/);
  assert.match(form, /value=\{subject\}/);
  assert.match(form, /setSubject\(event.target.value\)/);
  assert.match(form, /aria-describedby=\{fields.subject/);
  assert.doesNotMatch(form, /<select|Technique of interest|name="technique"/);
});

test("Shorts category retains its existing catalogue destination and shared navigation", () => {
  assert.equal(getCatalogueRange("pants-shorts")?.name, "Pants / Shorts");
  const grid = readFileSync("src/components/apparel-category-grid.tsx", "utf8");
  assert.ok(grid.includes('href={`/products?range=${category.slug}`}'));
  const header = readFileSync("src/components/site-header.tsx", "utf8");
  assert.match(header, /Create Your Brand/); assert.match(header, /Catalogue/); assert.match(header, /QuoteCartLink/);
});
