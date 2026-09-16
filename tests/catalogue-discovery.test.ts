import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { PublicProduct } from "../src/catalogue/customer.ts";
import { resolvePublicDescription } from "../src/catalogue/description.ts";
import { filterAndSortProducts } from "../src/catalogue/discovery.ts";
import robots from "../src/app/robots.ts";
import { assertSafeDevelopmentDatabase, loadLocalEnvironment } from "../scripts/development-database.ts";

loadLocalEnvironment();
assertSafeDevelopmentDatabase();

const product = (patch: Partial<PublicProduct> = {}): PublicProduct => ({ brand:"American Apparel",brandSlug:"american-apparel",category:"Tanks",categorySlug:"tanks",colours:[{code:"BL",description:"Black",images:[],variants:[{availability:"IN_STOCK",size:"M"}]}],createdAt:"2026-01-01T00:00:00.000Z",decorations:{dtf:true,embroidery:false,screenPrint:true},description:"Soft team tank",featured:false,galleryImages:[],id:"safe-product",name:"Racer Tank",newProduct:false,primaryImage:null,sizeChartHtml:"",slug:"racer-tank",status:"PUBLISHED",...patch});

test("search uses only customer-safe CXA catalogue fields", () => {
  const item = { ...product(), rawData: { secretPhrase:"wholesale-only-term" } } as PublicProduct;
  assert.equal(filterAndSortProducts([item], { query:"racer" }).length, 1);
  assert.equal(filterAndSortProducts([item], { query:"american apparel" }).length, 1);
  assert.equal(filterAndSortProducts([item], { query:"soft team" }).length, 1);
  assert.equal(filterAndSortProducts([item], { query:"wholesale-only-term" }).length, 0);
});

test("catalogue filters and customer sorts are deterministic", () => {
  const older = product({ id:"a",name:"Alpha",featured:false,createdAt:"2025-01-01T00:00:00.000Z" });
  const newer = product({ id:"z",name:"Zulu",featured:true,createdAt:"2026-01-01T00:00:00.000Z" });
  assert.deepEqual(filterAndSortProducts([older,newer],{sort:"featured"}).map(p=>p.id),["z","a"]);
  assert.deepEqual(filterAndSortProducts([older,newer],{sort:"newest"}).map(p=>p.id),["z","a"]);
  assert.deepEqual(filterAndSortProducts([older,newer],{sort:"name-desc"}).map(p=>p.id),["z","a"]);
  assert.equal(filterAndSortProducts([older],{availability:"IN_STOCK",brand:"american-apparel",category:"tanks",method:"DTF"}).length,1);
});

test("product copy follows CXA, supplier text, then sanitized HTML fallback", () => {
  assert.equal(resolvePublicDescription(" CXA copy ","supplier text","<p>HTML</p>"),"CXA copy");
  assert.equal(resolvePublicDescription(null," Supplier text ","<p>HTML</p>"),"Supplier text");
  assert.equal(resolvePublicDescription(null,null,"<p>Safe <strong>HTML</strong></p><script>bad()</script>"),"Safe HTML");
  assert.equal(resolvePublicDescription(null,null,null),null);
});

test("sitemap includes public discovery routes and excludes drafts and private workflows", async () => {
  const [{ database }, { default: sitemap }] = await Promise.all([import("../src/lib/database.ts"), import("../src/app/sitemap.ts")]);
  const slug = `task9-draft-${Date.now()}`;
  await database.product.create({data:{name:"Task 9 Draft",slug,status:"DRAFT"}});
  try {
    const urls=(await sitemap()).map(item=>item.url);
    assert.ok(urls.some(url=>url.endsWith("/products")));
    assert.ok(urls.some(url=>url.includes("/categories/")));
    assert.ok(urls.some(url=>url.includes("/brands/")));
    assert.ok(!urls.some(url=>url.includes(slug)));
    assert.ok(!urls.some(url=>url.includes("/quote/confirmation")));
    assert.ok(!urls.some(url=>url.includes("/api/")));
  } finally { await database.product.delete({where:{slug}}); }
});

test("robots protects private namespaces without blocking catalogue pages", () => {
  const result=robots(); const rules=Array.isArray(result.rules)?result.rules:[result.rules];
  assert.ok(rules.some(rule=>rule.allow==="/"));
  const denied=rules.flatMap(rule=>Array.isArray(rule.disallow)?rule.disallow:[rule.disallow]).filter(Boolean);
  assert.ok(denied.includes("/quote/confirmation/")); assert.ok(denied.includes("/api/")); assert.ok(denied.includes("/admin/"));
});

test("public metadata, structured data and navigation contain no confidential fields or dead placeholders", async () => {
  const paths=["src/app/page.tsx","src/app/products/[slug]/page.tsx","src/app/categories/[slug]/page.tsx","src/app/brands/[slug]/page.tsx","src/components/breadcrumbs.tsx","src/components/site-header.tsx","src/components/site-footer.tsx"];
  const source=(await Promise.all(paths.map(path=>readFile(new URL(`../${path}`,import.meta.url),"utf8")))).join("\n");
  for(const forbidden of ["supplierPrice","rawData","supplierVariantId","DATABASE_URL","PREMIUM_APPAREL_API_KEY","Authorization","\"offers\"","\"price\""]) assert.ok(!source.includes(forbidden));
  assert.ok(!source.includes('href="/#"'));
  assert.ok(!/Account|Saved/.test(source));
  assert.match(source,/BreadcrumbList/);
});

test("category and brand pages source products only through the published customer DTO", async () => {
  const source=(await Promise.all(["src/app/categories/[slug]/page.tsx","src/app/brands/[slug]/page.tsx"].map(path=>readFile(new URL(`../${path}`,import.meta.url),"utf8")))).join("\n");
  assert.match(source,/listPublishedProducts/);
  assert.ok(!/database\.|supplierProduct|rawData/.test(source));
});

test("privacy, terms, breadcrumbs and polished not-found content are present", async () => {
  const [privacy,terms,notFound,breadcrumbs]=await Promise.all(["src/app/privacy/page.tsx","src/app/terms/page.tsx","src/app/not-found.tsx","src/components/breadcrumbs.tsx"].map(path=>readFile(new URL(`../${path}`,import.meta.url),"utf8")));
  assert.match(privacy,/localStorage/); assert.match(privacy,/access or correct/); assert.match(terms,/Quote requests are not orders/); assert.match(notFound,/Browse products/); assert.match(breadcrumbs,/aria-label="Breadcrumb"/);
});
