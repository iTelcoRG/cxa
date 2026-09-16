import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalEnvironment, assertSafeDevelopmentDatabase } from "../scripts/development-database.ts";

loadLocalEnvironment();
let safe = false;
try { assertSafeDevelopmentDatabase(); safe = true; } catch { /* Never test against a remote database. */ }

test("review API persists separate people and pages, updates one review, and rejects invalid saves", { skip: !safe }, async () => {
  const { database } = await import("../src/lib/database.ts");
  const { GET, POST } = await import("../src/app/api/reviews/route.ts");
  const keys = [{ reviewer: "Neil", pagePath: "/privacy" }, { reviewer: "Lawrence", pagePath: "/privacy" }, { reviewer: "Neil", pagePath: "/terms" }];
  const created: typeof keys = [];
  const save = (data: unknown, origin = "https://cxa.example") => POST(new Request("https://cxa.example/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(data) }));
  try {
    assert.equal(await database.websiteReview.count({ where: { OR: keys } }), 0, "Refusing to overwrite existing review data in this test.");
    for (const [index, key] of keys.entries()) {
      const response = await save({ ...key, comment: `Test review ${index}`, status: "APPROVED" });
      assert.equal(response.status, 200); created.push(key);
    }
    assert.equal((await save({ ...keys[0], comment: "Updated comment", status: "CHANGES_REQUESTED" })).status, 200);
    const response = await GET(new Request("https://cxa.example/api/reviews?reviewer=Neil"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.reviews.find((r: { pagePath: string }) => r.pagePath === "/privacy").comment, "Updated comment");
    assert.equal(body.reviews.find((r: { pagePath: string }) => r.pagePath === "/terms").comment, "Test review 2");
    assert.equal((await database.websiteReview.findUniqueOrThrow({ where: { reviewer_pagePath: keys[1] } })).comment, "Test review 1");
    assert.equal(await database.websiteReview.count({ where: { OR: keys } }), 3);
    assert.equal((await save({ ...keys[0], comment: "bad", status: "APPROVED" }, "https://other.example")).status, 403);
    assert.equal((await save({ ...keys[0], pagePath: "/admin", comment: "bad", status: "APPROVED" })).status, 400);
    assert.equal((await GET(new Request("https://cxa.example/api/reviews?reviewer=Other"))).status, 400);
    assert.equal((await save({ ...keys[0], comment: "a".repeat(33_000), status: "APPROVED" })).status, 413);
  } finally {
    if (created.length) await database.websiteReview.deleteMany({ where: { OR: created } });
    await database.$disconnect();
  }
});
