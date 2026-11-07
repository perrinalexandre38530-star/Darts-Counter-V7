import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const paths = [
  'src/organizations/organizationShopRequests.ts',
  'src/components/OrganizationPublicShopRequestForm.tsx',
  'src/components/OrganizationShopRequestTracking.tsx',
  'src/components/OrganizationShopRequestsPanel.tsx',
  'src/pages/OrganizationPublicShopPage.tsx',
];
for (const path of paths) {
  const result = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${path}: ${errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, ' ')).join(', ')}`);
}
const sql = read('supabase/migrations/20261107143000_organization_shop_public_tracking_v25.sql');
const v24 = read('supabase/migrations/20261107124000_organization_shop_followup_v24.sql');
const service = read('src/organizations/organizationShopRequests.ts');
const publicPage = read('src/pages/OrganizationPublicShopPage.tsx');
const tracking = read('src/components/OrganizationShopRequestTracking.tsx');
const requestForm = read('src/components/OrganizationPublicShopRequestForm.tsx');
assert.match(sql, /FUNCTION public\.ms_org_shop_track_request_v25/);
assert.match(sql, /SECURITY DEFINER SET search_path=public,pg_temp/);
assert.match(sql, /p_organization_id uuid,\s*p_request_id uuid,\s*p_requester_email text/);
assert.match(sql, /WHERE id=p_request_id AND organization_id=p_organization_id/);
assert.match(sql, /lower\(requester_email\)=v_email/);
const returnSection = sql.split('RETURN jsonb_build_object(')[1].split(');')[0];
assert.match(returnSection, /'status'/);
assert.match(returnSection, /'itemTitle'/);
assert.doesNotMatch(returnSection, /requester_name|requester_email|requester_phone|internal_note|notes|actor_id/);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.ms_org_shop_track_request_v25.*TO anon,authenticated/);
assert.match(sql, /CREATE TRIGGER ms_org_shop_request_volume_guard_v25/);
assert.match(sql, /BEFORE INSERT ON public\.ms_organization_shop_requests/);
assert.match(sql, /pg_advisory_xact_lock/);
assert.match(sql, /v_last_ten_minutes >= 60 OR v_last_day >= 400/);
assert.match(v24, /CREATE TABLE IF NOT EXISTS public\.ms_organization_shop_request_events/);
assert.match(service, /trackPublicShopRequest/);
assert.match(tracking, /trackPublicShopRequest\(organizationId, reference, email\)/);
assert.match(publicPage, /<OrganizationShopRequestTracking/);
assert.match(publicPage, /onTrackRequest=/);
assert.match(requestForm, /onTrackRequest\?\.\(reference\)/);
assert.doesNotMatch(sql, /GRANT (SELECT|INSERT|UPDATE|DELETE) ON public\.ms_organization_shop_requests TO anon/);
console.log('V25: 5 fichiers TS/TSX valides syntaxiquement ; suivi client, confidentialité et anti-spam SQL contrôlés.');
