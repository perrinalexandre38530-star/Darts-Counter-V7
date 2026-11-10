// V27 — tests structurels locaux sans Supabase distant ni réseau push.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const get = p => fs.readFileSync(new URL('../' + p, import.meta.url),'utf8');
for (const file of [
  'src/organizations/organizationShopPush.ts',
  'src/components/OrganizationShopNotificationsPanel.tsx',
  'supabase/functions/shop-push-dispatch/index.ts',
]) {
  const result = ts.transpileModule(get(file), {fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`Syntax error: ${file}`);
}
const sql=get('supabase/migrations/20261109213000_organization_shop_web_push_v27.sql');
const v26=get('supabase/migrations/20261109185000_organization_shop_notifications_v26.sql');
const client=get('src/organizations/organizationShopPush.ts');
const panel=get('src/components/OrganizationShopNotificationsPanel.tsx');
const edge=get('supabase/functions/shop-push-dispatch/index.ts');
const sw=get('public/sw.js');
for (const rpc of ['ms_org_shop_push_register_v27','ms_org_shop_push_unsubscribe_v27','ms_org_shop_push_is_registered_v27','ms_org_shop_push_claim_v27','ms_org_shop_push_finish_v27']) assert.ok(sql.includes(rpc),`missing RPC ${rpc}`);
assert.match(v26,/AFTER INSERT ON public\.ms_organization_shop_requests/);
assert.match(sql,/AFTER INSERT ON public\.ms_organization_shop_notifications/);
assert.match(sql,/role IN \('owner','admin','manager'\)/);
assert.match(sql,/m\.status='active'/);
assert.match(sql,/ON CONFLICT\(notification_id,subscription_id\) DO NOTHING/);
assert.match(sql,/FOR UPDATE SKIP LOCKED/);
assert.match(sql,/ON CONFLICT \(endpoint\) DO UPDATE SET[\s\S]+WHERE ms_organization_shop_push_subscriptions\.user_id=EXCLUDED\.user_id/);
assert.match(sql,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.ms_org_shop_push_claim_v27\(integer\) TO service_role/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.ms_org_shop_push_register_v27\(text,text,text,text\) TO authenticated/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.ms_org_shop_push_unsubscribe_v27\(text\) TO authenticated/);
assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON public\.ms_organization_shop_push_/);
assert.match(sql,/REVOKE ALL ON public\.ms_organization_shop_push_subscriptions FROM PUBLIC,anon,authenticated/);
assert.match(sql,/REVOKE ALL ON public\.ms_organization_shop_push_deliveries FROM PUBLIC,anon,authenticated/);
const envelope=sql.slice(sql.indexOf('jsonb_build_object('),sql.indexOf(')),'));
for (const secret of ['requester_email','requester_phone','internal_note','requester_name']) assert.ok(!envelope.includes(secret),`leak ${secret}`);
assert.match(client,/Capacitor\.isNativePlatform\(\)/);
assert.match(client,/PushManager/);
assert.match(client,/Notification\.requestPermission\(\)/);
assert.match(client,/applicationServerKey/);
assert.match(client,/!currentSubscriptionUsesKey\(sub\)/);
assert.match(panel,/enableShopPush/);
assert.match(panel,/disableShopPush/);
assert.match(panel,/!pushEnabled/);
assert.match(sw,/addEventListener\("push"/);
assert.match(sw,/addEventListener\("notificationclick"/);
assert.match(edge,/SHOP_PUSH_CRON_SECRET/);
assert.match(edge,/SHOP_PUSH_VAPID_PRIVATE_KEY/);
assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(edge,/isSafePushEndpoint/);
assert.match(edge,/"shop_request"/);
assert.match(edge,/webpush\.sendNotification/);
assert.doesNotMatch(edge,/requester_email|requester_phone|internal_note/);
assert.ok(fs.existsSync(new URL('../supabase/functions/shop-push-dispatch/deno.json',import.meta.url)));
console.log('V27 OK — port V26, push PWA, flux serveur privé, files atomiques, rôles, retry, secrets et confidentialité.');
