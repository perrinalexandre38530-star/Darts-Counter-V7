import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const page=read('src/pages/OrganizationsPage.tsx');
const service=read('src/organizations/organizationService.ts');
const media=read('src/lib/userMediaFallback.ts');
const sql=read('supabase/migrations/20260907180500_partnership_organizations_profile_v2.sql');
const checks=[
  ['guided wizard', page.includes('WIZARD_STEPS = 8') && page.includes('CRÉATION GUIDÉE')],
  ['organization profile view', page.includes('Fiche organisme') && page.includes('profileCompleted')],
  ['logo + cover pickers', page.includes('organizationLogoMediaKey') && page.includes('organizationCoverMediaKey')],
  ['selected storage respected', page.includes('loadStoragePrefs') && page.includes('selectedDestination === "cloud_r2"')],
  ['media vault integration', page.includes('captureUserMediaFallback') && media.includes('club_logo') && media.includes('club_cover')],
  ['supabase metadata only', service.includes('ms_org_update_profile') && sql.includes('logo_media_key') && sql.includes('cover_media_key')],
  ['cloud groups + events', service.includes('ms_organization_groups') && service.includes('ms_organization_events') && page.includes('listOrganizationGroups') && page.includes('listOrganizationEvents')],
  ['profile size guard', sql.includes('octet_length(profile::text) <= 16384') && sql.includes('PROFILE_TOO_LARGE')],
  ['no heavy binary column', !/\bbytea\b/i.test(sql.replace(/--.*$/gm,'')) && !/add column[^;]*(data_url|image_data|photo_data)/i.test(sql)],
];
let failed=0;
for (const [name,ok] of checks){ console.log(`${ok?'OK':'FAIL'} ${name}`); if(!ok) failed++; }
if(failed) process.exit(1);
console.log(`Organizations onboarding V2: ${checks.length}/${checks.length} checks OK`);
