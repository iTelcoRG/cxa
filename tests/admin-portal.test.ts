import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hash } from "bcryptjs";
import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "../scripts/development-database.ts";
import { can, assertCapability } from "../src/admin/permissions.ts";
import { canTransitionQuote } from "../src/admin/quote-workflow.ts";
import { safeNote, safeSearch } from "../src/admin/validation.ts";

loadLocalEnvironment(); assertSafeDevelopmentDatabase();

test("role permissions are centralized and enforce write boundaries", () => {
  assert.equal(can("ADMIN", "catalogue:write"), true);
  assert.equal(can("CATALOGUE_MANAGER", "catalogue:write"), true);
  assert.equal(can("CATALOGUE_MANAGER", "quotes:write"), false);
  assert.equal(can("QUOTE_MANAGER", "quotes:write"), true);
  assert.equal(can("QUOTE_MANAGER", "catalogue:write"), false);
  assert.equal(can("READ_ONLY", "admin:read"), true);
  assert.throws(() => assertCapability("READ_ONLY", "quotes:write"));
});

test("quote workflow accepts valid progress and rejects nonsensical jumps", () => {
  assert.equal(canTransitionQuote("SUBMITTED", "REVIEWING"), true);
  assert.equal(canTransitionQuote("REVIEWING", "DECLINED"), true);
  assert.equal(canTransitionQuote("SUBMITTED", "COMPLETED"), false);
  assert.equal(canTransitionQuote("COMPLETED", "REVIEWING"), false);
});

test("plain-text notes and bounded searches reject unsafe input", () => {
  assert.equal(safeNote.parse("Call customer before production"), "Call customer before production");
  assert.throws(() => safeNote.parse("<b>private</b>"));
  assert.equal(safeSearch.parse("x".repeat(200)), "");
});

test("staff credential verification handles valid, invalid, and inactive users without serializing hashes", async () => {
  const { database } = await import("../src/lib/database.ts");
  const { authorizeStaffCredentials } = await import("../src/admin/credentials.ts");
  const email = `task10-${Date.now()}@example.invalid`; const password = "Task10-test-password!";
  const staff = await database.staffUser.create({ data: { email, name: "Task 10 Test", passwordHash: await hash(password, 12), role: "ADMIN", active: true } });
  try {
    const valid = await authorizeStaffCredentials({ email, password });
    assert.deepEqual(Object.keys(valid!).sort(), ["email", "id", "name", "role"]);
    assert.equal(await authorizeStaffCredentials({ email, password: "incorrect" }), null);
    await database.staffUser.update({ where: { id: staff.id }, data: { active: false } });
    assert.equal(await authorizeStaffCredentials({ email, password }), null);
  } finally {
    await database.adminAuditLog.deleteMany({ where: { staffUserId: staff.id } });
    await database.staffUser.delete({ where: { id: staff.id } });
  }
});

test("admin mutations re-authorize server-side and audit required writes", async () => {
  const source = await readFile("src/admin/actions.ts", "utf8");
  assert.match(source, /requireStaff\("quotes:write"\)/);
  assert.match(source, /requireStaff\("catalogue:write"\)/);
  for (const action of ["QUOTE_STATUS_CHANGED", "QUOTE_INTERNAL_NOTE_ADDED", "PRODUCT_UPDATED", "SUPPLIER_PRODUCT_PUBLISHED", "SUPPLIER_PRODUCT_LINKED", "BRAND_CREATED", "CATEGORY_CREATED"]) assert.match(source, new RegExp(action));
  assert.doesNotMatch(source, /rawData|PREMIUM_APPAREL_API_KEY|AUTH_SECRET|passwordHash/);
});

test("every protected admin page calls the centralized staff DAL", async () => {
  const pages = ["src/app/admin/(portal)/page.tsx", "src/app/admin/(portal)/quotes/page.tsx", "src/app/admin/(portal)/products/page.tsx", "src/app/admin/(portal)/suppliers/page.tsx"];
  const layout = await readFile("src/app/admin/(portal)/layout.tsx", "utf8");
  assert.match(layout, /requireStaff\(\)/);
  for (const page of pages) assert.doesNotMatch(await readFile(page, "utf8"), /passwordHash|AUTH_SECRET|PREMIUM_APPAREL_API_KEY/);
});

test("supplier pricing is limited to authorized catalogue roles and absent from listings", async () => {
  const browser = await readFile("src/app/admin/(portal)/suppliers/[supplierId]/products/page.tsx", "utf8");
  const detail = await readFile("src/app/admin/(portal)/suppliers/[supplierId]/products/[productId]/page.tsx", "utf8");
  assert.doesNotMatch(browser, /supplierPrice/);
  assert.match(detail, /can\(staff\.role,\s*"catalogue:write"\)/);
  assert.match(detail, /CONFIDENTIAL/);
});

test("internal notes and staff models remain absent from customer confirmation DTO", async () => {
  const confirmation = await readFile("src/quotes/confirmation.ts", "utf8");
  const customer = await readFile("src/catalogue/customer.ts", "utf8");
  for (const source of [confirmation, customer]) assert.doesNotMatch(source, /QuoteInternalNote|AdminAuditLog|StaffUser|passwordHash/);
});

test("admin seed requires environment credentials and never embeds a password", async () => {
  const source = await readFile("scripts/admin-seed.ts", "utf8");
  assert.match(source, /CXA_ADMIN_EMAIL/); assert.match(source, /CXA_ADMIN_PASSWORD/); assert.match(source, /hash\(password, 12\)/);
  assert.doesNotMatch(source, /password:\s*["'][^"']+["']/);
});

test("schema contains staff, internal note, audit, and authored content fields", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  for (const model of ["model StaffUser", "model QuoteInternalNote", "model AdminAuditLog"]) assert.match(schema, new RegExp(model));
  assert.match(schema, /enum StaffRole/); assert.match(schema, /description String\?/);
});

test("admin navigation contains implemented catalogue and operational routes", async () => {
  const shell = await readFile("src/components/admin-shell.tsx", "utf8");
  const settings = await readFile("src/app/admin/(portal)/settings/page.tsx", "utf8");
  for (const route of ["/admin/quotes", "/admin/products", "/admin/suppliers", "/admin/brands", "/admin/categories", "/admin/settings"]) assert.match(shell, new RegExp(route));
  assert.match(shell, /\/admin\/production/); assert.match(shell, /\/admin\/purchase-orders/); assert.doesNotMatch(shell, /Sync Now/); assert.match(settings, /reserved for Task 11/);
});

test("brand and category public DTOs consume CXA-authored descriptions", async () => {
  const customer = await readFile("src/catalogue/customer.ts", "utf8");
  const brandPage = await readFile("src/app/brands/[slug]/page.tsx", "utf8");
  const categoryPage = await readFile("src/app/categories/[slug]/page.tsx", "utf8");
  assert.match(customer, /description: true/); assert.match(brandPage, /brand\.description/); assert.match(categoryPage, /category\.description/);
});
