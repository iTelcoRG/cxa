import assert from "node:assert/strict";
import { test } from "node:test";

import {
  customerDetailsSchema,
  quoteSubmissionSchema,
  validateSubmissionTiming,
} from "../src/quotes/customer-validation.ts";
import {
  buildCustomerConfirmation,
  buildStaffNotification,
  type NotificationQuote,
} from "../src/quotes/notifications.ts";

const customer = {
  customerName: "  Jane Customer  ",
  businessName: "CXA Test Business",
  email: " JANE@EXAMPLE.COM ",
  phone: "+64 21 123 4567",
  requiredBy: "",
  deliveryMethod: "PICKUP",
  deliveryAddress: "",
  customerNotes: "Please contact by email.",
};

test("customer details are normalized and pickup does not require an address", () => {
  const result = customerDetailsSchema.parse(customer);
  assert.equal(result.customerName, "Jane Customer");
  assert.equal(result.email, "jane@example.com");
  assert.equal(result.deliveryAddress, undefined);
});

test("invalid email, past date, and HTML-like notes are rejected", () => {
  assert.equal(customerDetailsSchema.safeParse({ ...customer, email: "not-email" }).success, false);
  assert.equal(customerDetailsSchema.safeParse({ ...customer, requiredBy: "2020-01-01" }).success, false);
  assert.equal(customerDetailsSchema.safeParse({ ...customer, customerNotes: "<b>unsafe</b>" }).success, false);
});

test("delivery requires an address while pickup does not", () => {
  assert.equal(
    customerDetailsSchema.safeParse({ ...customer, deliveryMethod: "DELIVERY", deliveryAddress: "" }).success,
    false,
  );
  assert.equal(
    customerDetailsSchema.safeParse({ ...customer, deliveryMethod: "DELIVERY", deliveryAddress: "1 Queen Street, Auckland" }).success,
    true,
  );
});

test("empty cart, honeypot, and implausible timing are rejected", () => {
  const base = {
    customer,
    lines: [],
    idempotencyKey: "aa7a0000-0000-4000-8000-000000000001",
    website: "",
    startedAt: Date.now() - 2_000,
  };
  assert.equal(quoteSubmissionSchema.safeParse(base).success, false);
  assert.equal(quoteSubmissionSchema.safeParse({ ...base, lines: [{}], website: "bot" }).success, false);
  assert.ok(validateSubmissionTiming(Date.now() - 100));
  assert.equal(validateSubmissionTiming(Date.now() - 2_000), null);
});

test("notification templates contain required safe content and no wholesale fields", () => {
  const quote: NotificationQuote = {
    artworkFiles: [],
    quoteNumber: "CXA-2026-00001",
    customerName: "Jane Customer",
    businessName: "Example Limited",
    email: "jane@example.com",
    phone: "+64 21 123 4567",
    requiredBy: null,
    deliveryMethod: "PICKUP",
    customerNotes: null,
    totalGarments: 5,
    lines: [{
      productName: "CXA Test Tank",
      colourDescription: "Black",
      customerNotes: null,
      sizes: [{ size: "M", quantity: 5 }],
      decorations: [{ locationLabel: "Left Chest", methodLabel: "DTF", customerNote: "White logo" }],
    }],
  };
  const staff = JSON.stringify(buildStaffNotification(quote));
  const confirmation = JSON.stringify(buildCustomerConfirmation(quote));
  assert.match(staff, /CXA-2026-00001/);
  assert.match(confirmation, /No payment has been taken/);
  for (const serialized of [staff, confirmation]) {
    assert.doesNotMatch(serialized, /supplierPrice|rawData|supplierVariantId|wholesale|DATABASE_URL|Authorization/i);
  }
});
