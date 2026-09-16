import { mkdirSync, writeFileSync } from 'node:fs';
import { loadLocalEnvironment, assertSafeDevelopmentDatabase } from './development-database.ts';
loadLocalEnvironment(); assertSafeDevelopmentDatabase();
const { database: db } = await import('../src/lib/database.ts');
const { publishSupplierProductToCXA } = await import('../src/catalogue/publishing.ts');
const folder = '.cxa-backups/catalogue-preview-' + new Date().toISOString().replace(/[:.]/g,'-');
mkdirSync(folder,{recursive:true});
try {
 const identity = await db.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`;
 if(identity[0]?.name !== 'cxa_dev') throw new Error('Unexpected database');
 const before=await Promise.all([db.product.findMany(),db.productSupplier.findMany(),db.category.findMany(),db.brand.findMany()]);
 writeFileSync(folder+'/catalogue-before.json',JSON.stringify({products:before[0],links:before[1],categories:before[2],brands:before[3]},null,2));
 const items=await db.supplierProduct.findMany({where:{active:true,supplier:{slug:'premium-apparel'}},select:{id:true},orderBy:{supplierTitle:'asc'}});
 const report:{created:string[],existing:string[],failed:string[]}={created:[],existing:[],failed:[]};
 for(const [index,item] of items.entries()){
  try {
   const result=await publishSupplierProductToCXA({supplierProductId:item.id,status:'PUBLISHED'});
   report[result.created?'created':'existing'].push(result.product.id);
  }catch{report.failed.push(item.id)}
  writeFileSync(folder+'/publication-report.json',JSON.stringify(report,null,2));
  if((index+1)%100===0) console.log('Processed',index+1,'of',items.length);
 }
 console.log(JSON.stringify({created:report.created.length,existing:report.existing.length,failed:report.failed.length,published:await db.product.count({where:{status:'PUBLISHED'}}),backup:folder}));
 if(report.failed.length) process.exitCode=1;
} finally {await db.$disconnect()}

