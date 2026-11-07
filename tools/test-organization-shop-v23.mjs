import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const files = [
 'src/organizations/organizationShop.ts',
 'src/organizations/organizationPublicShop.ts',
 'src/organizations/organizationShopRequests.ts',
 'src/components/OrganizationShopPanel.tsx',
 'src/components/OrganizationShopRequestsPanel.tsx',
 'src/components/OrganizationPublicShopRequestForm.tsx',
 'src/pages/OrganizationPublicShopPage.tsx',
];
for(const path of files){
 const s=read(path);
 const t=ts.transpileModule(s,{fileName:path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 const errs=(t.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(errs.length,0,`${path}: ${errs.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`);
}
const sql=read('supabase/migrations/20261107090000_organization_shop_reservations_v23.sql');
const shop=read('src/organizations/organizationShop.ts');
const pub=read('src/pages/OrganizationPublicShopPage.tsx');
const admin=read('src/components/OrganizationShopRequestsPanel.tsx');
assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.ms_organization_shop_requests/);
assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.ms_org_shop_submit_request_v23/);
assert.match(sql,/is_published=true/);
assert.match(sql,/status='published'/);
assert.match(sql,/category IN \('official_kit','clothing','goodies'\)/);
assert.match(sql,/stock_quantity=stock_quantity-v_request\.quantity/);
assert.match(sql,/FOR UPDATE/);
assert.match(sql,/stock_allocated/);
assert.match(sql,/pg_advisory_xact_lock/);
assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE) ON public\.ms_organization_shop_requests TO anon/);
assert.match(pub,/canRequest\(selected\)/);
assert.match(admin,/setOrganizationShopRequestStatus/);
assert.match(shop,/stock_quantity/);
console.log('V23: 7 TS/TSX parsés, contrôles SQL/RLS/stock/public OK.');
