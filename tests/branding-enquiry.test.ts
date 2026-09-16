import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { allBrandingTechniques, additionalBrandingTechniques, findTechnique, techniqueContactHref } from "../src/content/decoration-techniques.ts";
import { subjectFromTechnique } from "../src/contact/subject.ts";
import { canStackCards } from "../src/content/branding-layout.ts";
import { buildEnquiryMessage, enquirySchema, submitEnquiry } from "../src/contact/enquiry.ts";

const expected = ["screen-printing", "embroidery", "heat-transfer", "dtg-printing", "sublimation", "discharge-printing", "hot-split-transfer", "reflective-printing", "applique-embroidery", "foil-printing", "puff-printing", "glitter-printing", "distressed-clear-ink", "neon-colours", "mixed-techniques"];
test("all fifteen techniques have unique stable mappings, supplied images and detail content", () => {
  assert.deepEqual(allBrandingTechniques.map(item => item.slug), expected);
  assert.equal(additionalBrandingTechniques.length, 12);
  for (const item of allBrandingTechniques) {
    assert.equal(findTechnique(item.slug), item);
    assert.ok(existsSync(`public${item.image.src}`), item.image.src);
    assert.ok(item.bestFor.length > 25);
    const contact = new URL(techniqueContactHref(item.slug), "https://cxa.co.nz");
    assert.equal(contact.pathname, "/contact");
    assert.equal(contact.hash, "#contact-form");
    assert.equal(findTechnique(contact.searchParams.get("technique"))?.title, item.title);
  }
});
test("unknown, repeated and untrusted query values never become Contact selections", () => {
  for (const value of [undefined, null, "", "unknown", "DTG printing", "__proto__", "<script>alert(1)</script>", ["embroidery", "heat-transfer"]]) assert.equal(findTechnique(value), undefined);
  assert.equal(techniqueContactHref("unknown"), "/contact#contact-form");
});
test("sticky fits full cards below real header and falls back for short screens or enlarged text", () => {
  assert.equal(canStackCards(900, 97, [512, 512, 512], 16), true);
  assert.equal(canStackCards(600, 97, [512, 512, 512], 16), false);
  assert.equal(canStackCards(844, 73, [580, 620, 680], 16), true);
  assert.equal(canStackCards(844, 73, [580, 620, 760], 16), false);
  assert.equal(canStackCards(900, 97, [1000, 1100, 1200], 32), false);
  assert.equal(canStackCards(900, 400, [512, 512, 512], 16), false);
  assert.equal(canStackCards(900, 97, [], 16), false);
});
const valid = { name: "Test Customer", email: "customer@example.test", subject: "DTG printing enquiry", message: "Please advise about a small run of cotton tees.", website: "" };
test("each validated enquiry includes the selected human-readable technique in the staff message", async () => {
  for (const item of allBrandingTechniques) {
    const result = await submitEnquiry({ ...valid, subject: subjectFromTechnique(item.slug) }, async enquiry => {
      const message = buildEnquiryMessage(enquiry);
      assert.equal(enquiry.subject, `${item.title} enquiry`);
      assert.ok(message.text.includes(`Subject: ${item.title} enquiry`));
      assert.equal(message.replyTo, valid.email);
    });
    assert.equal(result.status, 200);
  }
  assert.ok(buildEnquiryMessage({ ...valid, subject: "Account enquiry" }).text.includes("Subject: Account enquiry"));
});
test("invalid fields, injected subjects and honeypot submissions cannot reach delivery", async () => {
  for (const change of [{ email: "invalid" }, { name: "Name\r\nInjected" }, { message: "short" }, { subject: "Unsafe\r\nBcc: injected@example.test" }, { website: "spam.example" }]) {
    const result = await submitEnquiry({ ...valid, ...change }, async () => assert.fail("Invalid enquiry reached email delivery"));
    assert.equal(result.status, 400);
  }
  assert.equal(enquirySchema.safeParse({ ...valid, subject: "" }).success, false);
});
test("delivery failures cannot report success; validated selection survives retry", async () => {
  const input = { ...valid };
  const result = await submitEnquiry(input, async () => { throw new Error("SMTP unavailable"); });
  assert.equal(result.status, 503);
  assert.equal(result.body.success, undefined);
  assert.equal(input.subject, "DTG printing enquiry");
  assert.equal((await submitEnquiry(input, async () => {})).status, 200);
});
