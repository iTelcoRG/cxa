import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLocalEnvironment } from "../scripts/development-database.ts";
loadLocalEnvironment();
const { hashProofToken } = await import("../src/operations/proofs.ts");
const { workflowTransitions, WorkflowGateError } = await import("../src/operations/workflow.ts");

test("operational workflow follows the gated production sequence", () => {
  assert.deepEqual(workflowTransitions.QUOTE_SUBMITTED, ["ARTWORK_REVIEW", "CANCELLED"]);
  assert.ok(workflowTransitions.AWAITING_CUSTOMER_APPROVAL.includes("PRODUCTION_PLANNING"));
  assert.ok(!workflowTransitions.ARTWORK_REVIEW.includes("IN_PRODUCTION"));
  assert.deepEqual(workflowTransitions.COMPLETED, []);
});

test("proof tokens are represented by deterministic hashes, not plaintext", () => {
  const token = "a".repeat(43);
  const hash = hashProofToken(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hash, hashProofToken(token));
  assert.notEqual(hash, hashProofToken("b".repeat(43)));
});

test("workflow gate errors retain actionable reasons", () => {
  const error = new WorkflowGateError(["Approve artwork.", "Resolve revisions."]);
  assert.equal(error.name, "WorkflowGateError");
  assert.deepEqual(error.reasons, ["Approve artwork.", "Resolve revisions."]);
  assert.match(error.message, /Approve artwork/);
});
