import test from "node:test";
import assert from "node:assert/strict";
import { mainReviewPages, reviewers, reviewSchema } from "../src/reviews/shared.ts";

test("review validation accepts each reviewer and sign-off with or without comments", () => {
  for (const reviewer of reviewers) for (const status of ["NOT_REVIEWED", "CHANGES_REQUESTED", "APPROVED"]) {
    assert.ok(reviewSchema.safeParse({ reviewer, pagePath: "/", status, comment: "" }).success);
  }
});

test("invalid names, statuses, oversized comments and unexpected fields are rejected", () => {
  const valid = { reviewer: "Neil", pagePath: "/", status: "APPROVED", comment: "Looks good" };
  for (const change of [{ reviewer: "Other" }, { status: "invalid" }, { comment: "a".repeat(5001) }, { pagePath: "" }, { rawData: {} }]) {
    assert.equal(reviewSchema.safeParse({ ...valid, ...change }).success, false);
  }
  assert.ok(reviewSchema.safeParse({ ...valid, comment: "a".repeat(5000) }).success);
  assert.equal(new Set(mainReviewPages.map(page => page.path)).size, mainReviewPages.length);
});
