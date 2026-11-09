// MSS V26 — centre d'alertes de la Boutique (tests structurels sans base distante).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const codeFiles = [
  'src/organizations/organizationShopNotifications.ts',
  'src/components/OrganizationShopNotificationsPanel.tsx',
  'src/components/OrganizationShopRequestsPanel.tsx',
  'src/components/OrganizationShopRequestTracking.tsx',
];
for (const file of codeFiles) {
  const result = ts.transpileModule(read(file), { fileName: file, reportDiagnostics: true, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  }});
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0,
    `Invalid TS/TSX in ${file}`);
}
const sql = read('supabase/migrations/20261109185000_organization_shop_notifications_v26.sql');
const service = read('src/organizations/organizationShopNotifications.ts');
const manager = read('src/components/OrganizationShopNotificationsPanel.tsx');
const requests = read('src/components/OrganizationShopRequestsPanel.tsx');
const customer = read('src/components/OrganizationShopRequestTracking.tsx');
for (const name of [
  'ms_organization_shop_notifications', 'ms_organization_shop_notification_cursors',
  'ms_org_shop_emit_notification_v26', 'ms_org_shop_list_notifications_v26',
  'ms_org_shop_mark_notifications_read_v26',
]) assert.ok(sql.includes(name), `SQL missing ${name}`);
assert.match(sql,/AFTER INSERT ON public\.ms_organization_shop_requests/);
assert.match(sql,/AFTER UPDATE OF status ON public\.ms_organization_shop_requests/);
assert.match(sql,/OLD\.status IS DISTINCT FROM NEW\.status/);
assert.match(sql,/SECURITY DEFINER SET search_path=public,pg_temp/g);
assert.match(sql,/ms_org_has_role\(p_organization_id,ARRAY\['owner','admin','manager'\]\)/);
assert.match(sql,/PRIMARY KEY \(organization_id,user_id\)/);
assert.match(sql,/RLS|ROW LEVEL SECURITY/);
assert.match(sql,/REVOKE ALL ON public\.ms_organization_shop_notifications FROM PUBLIC,anon,authenticated/);
assert.match(sql,/REVOKE ALL ON public\.ms_organization_shop_notification_cursors FROM PUBLIC,anon,authenticated/);
assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON public\.ms_organization_shop_notification/i);
assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION public\.ms_org_shop_list_notifications_v26\(uuid\) TO anon/);
const json = sql.split("SELECT coalesce(jsonb_agg(jsonb_build_object(")[1].split(") ORDER BY n.id DESC")[0];
for (const field of ["requester_name", "requester_email", "requester_phone", "internal_note", "notes", "actor_id"])
  assert.ok(!json.includes(field), `Data exposure in notifications: ${field}`);
for (const value of ["new_request", "status_changed", "created_at", "item_title", "new_status"])
  assert.ok(sql.includes(value), `Missing notification event detail ${value}`);
assert.match(service,/ms_org_shop_list_notifications_v26/);
assert.match(service,/ms_org_shop_mark_notifications_read_v26/);
assert.match(manager,/45000/);
assert.match(manager,/Notification\.requestPermission\(\)/);
assert.match(manager,/lastMaxId !== null/); // Ne pas notifier les anciennes demandes au premier chargement
assert.match(manager,/markClubShopNotificationsRead/);
assert.match(requests,/<OrganizationShopNotificationsPanel/);
assert.match(requests,/setSearch\(requestId\)/);
assert.match(customer,/trackPublicShopRequest\(organizationId, verified\.reference, verified\.email\)/);
assert.match(customer,/60000/);
assert.match(customer,/setChangeNotice\(true\)/);
assert.doesNotMatch(customer,/localStorage|sessionStorage/);
console.log('OK V26 — 4 fichiers TS/TSX syntaxiquement valides, permissions serveur, lecture par responsable, alertes et suivi client contrôlés.');
