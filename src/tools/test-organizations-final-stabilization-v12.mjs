import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const service=read('src/organizations/organizationService.ts');
const page=read('src/pages/OrganizationsPage.tsx');
const calendar=read('src/components/OrganizationCalendarPanel.tsx');
const profile=read('src/components/OrganizationProfilePanel.tsx');
const switcher=read('src/components/OrganizationWorkspaceSwitcher.tsx');
const sql=read('supabase/migrations/20260917184500_partnership_organizations_stabilization_v12.sql');
const checks=[
 ['workspace switcher visible before first organization', !switcher.includes('if (!organizations.length) return null')],
 ['profile editor mounted', page.includes('OrganizationProfilePanel') && profile.includes('updateOrganizationIdentity') && profile.includes('updateOrganizationProfile')],
 ['profile media remains external', profile.includes('captureUserMediaFallback') && profile.includes('organizationLogoMediaKey') && profile.includes('organizationCoverMediaKey')],
 ['calendar panel mounted', page.includes('OrganizationCalendarPanel')],
 ['calendar full CRUD client', service.includes('ms_org_create_event') && service.includes('ms_org_update_event') && service.includes('ms_org_delete_event')],
 ['calendar supports team/type/end', calendar.includes('groupId') && calendar.includes('eventType') && calendar.includes('endsAt')],
 ['captain agenda scope in UI', calendar.includes('captainGroups') && calendar.includes('CAPTAIN')===false],
 ['identity rpc secured', sql.includes('ms_org_update_identity') && sql.includes("array['owner','admin']")],
 ['event direct writes revoked', sql.includes('revoke insert,update,delete on public.ms_organization_events from authenticated')],
 ['captain event scope server-side', sql.includes("v_role='captain'") && sql.includes('captain_user_id=v_uid')],
 ['no V12 table creation', !/create\s+table/i.test(sql)],
 ['no heavy event media schema', !/(bytea|history_json|stats_json|image_data|photo_data)/i.test(sql)],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`); if(pass) ok++;}
console.log(`${ok}/${checks.length} ORGANISATIONS FINAL STABILIZATION V12`);
if(ok!==checks.length) process.exit(1);
