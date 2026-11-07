import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
for (const path of [
  'src/organizations/organizationShopRequests.ts',
  'src/components/OrganizationShopRequestsPanel.tsx',
  'src/components/OrganizationPublicShopRequestForm.tsx',
]) {
  const t = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const issues = (t.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(issues.length, 0, `${path}: ${issues.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')}`);
}
const sql = read('supabase/migrations/20261107124000_organization_shop_followup_v24.sql');
const panel = read('src/components/OrganizationShopRequestsPanel.tsx');
const api = read('src/organizations/organizationShopRequests.ts');
const form = read('src/components/OrganizationPublicShopRequestForm.tsx');
assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ms_organization_shop_request_events/);
assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
assert.match(sql, /FOR SELECT TO authenticated/);
assert.match(sql, /FOR EACH ROW/);
assert.match(sql, /AFTER UPDATE OF status/);
assert.match(sql, /SECURITY DEFINER SET search_path=public,pg_temp/);
assert.match(sql, /ARRAY\['owner','admin','manager'\]/);
assert.match(sql, /ARRAY\['owner','admin'\]/);
assert.match(sql, /FOR UPDATE/);
assert.match(sql, /status NOT IN \('completed','rejected','cancelled'\)/);
assert.match(sql, /interval '90 days'/);
assert.match(sql, /REVOKE ALL ON public\.ms_organization_shop_request_events FROM PUBLIC,anon,authenticated/);
assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE) ON public\.ms_organization_shop_request_events/);
assert.match(panel, /downloadCsv\(shown\)/);
assert.match(panel, /setShopRequestInternalNote/);
assert.match(panel, /anonymizeShopRequest/);
assert.match(panel, /listShopRequestEvents/);
assert.match(panel, /\[=\+@\\-\\t\]/);
assert.match(api, /ms_org_shop_set_internal_note_v24/);
assert.match(api, /ms_org_shop_anonymize_request_v24/);
assert.match(form, /name="company_website_2"/);
assert.match(form, /honeypot \}/);
assert.match(api, /p_honeypot: value.honeypot/);
console.log('V24: syntaxe TS/TSX, flux notes/journal, RLS, anonymisation, CSV et piège anti-bot validés.');
