import assert from "node:assert/strict";
import test from "node:test";
import { matchesCatalogueRange } from "../src/catalogue/ranges.ts";
import { filterAndSortProducts } from "../src/catalogue/discovery.ts";
import type { PublicProduct } from "../src/catalogue/customer.ts";

test("hoodies span supplier categories without including supplier services", () => {
  for (const product of [
    {name:"Off-Field Hoodie Full Zip",categorySlug:"off-field"},
    {name:"Gildan Hooded Sweatshirt",categorySlug:"fleece"},
    {name:"Recycled Hi Vis Zipped Hoodie",categorySlug:"hi-vis"},
  ]) assert.equal(matchesCatalogueRange(product,"sweatshirts-hoodies"),true);
  for (const name of ["Hood Lining Change","Hoodie / Sweat Neck Relabel","Cotton T-Shirt"])
    assert.equal(matchesCatalogueRange({name,categorySlug:name.startsWith("Hood Lining")?"hoodies":"other-apparel"},"sweatshirts-hoodies"),false);
});

test("range aliases combine singular categories and avoid misleading title matches", () => {
  assert.equal(matchesCatalogueRange({name:"Cotton Tank",categorySlug:"tanks"},"singlets"),true);
  assert.equal(matchesCatalogueRange({name:"Pique Polo",categorySlug:"polo"},"polos"),true);
  assert.equal(matchesCatalogueRange({name:"Cotton Long Sleeve Tee",categorySlug:"t-shirt"},"longsleeve"),true);
  assert.equal(matchesCatalogueRange({name:"Fleece Beanie",categorySlug:"headwear"},"fleece"),false);
  assert.equal(matchesCatalogueRange({name:"TSHIRT POLO",categorySlug:"premsub"},"t-shirts"),false);
  assert.equal(matchesCatalogueRange({name:"Hoodie",categorySlug:"hoodies"},"unknown-range"),false);
});

test("brand and search filters narrow a selected range without resetting it", () => {
  const base: PublicProduct = {id:"one",name:"Navy Hoodie",slug:"navy-hoodie",brand:"Brand A",brandSlug:"a",category:"Off-Field",categorySlug:"off-field",colours:[],decorations:{dtf:true,screenPrint:false,embroidery:false},description:null,featured:false,galleryImages:[],newProduct:false,primaryImage:null,sizeChartHtml:"",status:"PUBLISHED"};
  const products=[base,{...base,id:"two",name:"Navy Polo"},{...base,id:"three",brandSlug:"b"}];
  assert.deepEqual(filterAndSortProducts(products,{range:"sweatshirts-hoodies",brand:"a",query:"navy"}).map(p=>p.id),["one"]);
  assert.equal(products.length,3);
});
