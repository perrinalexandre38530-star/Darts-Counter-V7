import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const service = read('src/organizations/organizationService.ts');
const panel = read('src/components/OrganizationTeamsPanel.tsx');
const page = read('src/pages/OrganizationsPage.tsx');
const migration = read('supabase/migrations/20260914102000_partnership_organizations_teams_v4.sql');

const checks = [
  ['service V3 escaped newlines repaired', !service.includes('\\n\\nfunction parseOrganizationMember')],
  ['group model has captain/logo/colors/status', ['captainUserId','logoMediaKey','primaryColor','secondaryColor','memberCount','status'].every((x) => service.includes(x))],
  ['group listing uses secured RPC', service.includes('ms_org_list_groups')],
  ['group create/update/delete RPCs wired', ['ms_org_create_group','ms_org_update_group','ms_org_delete_group'].every((x) => service.includes(x))],
  ['team panel wired into Organizations page', page.includes('OrganizationTeamsPanel') && page.includes('view === "groups"')],
  ['team panel supports roster', panel.includes('setOrganizationGroupMember') && panel.includes('EFFECTIF DE L’ÉQUIPE')],
  ['team panel supports captain', panel.includes('captainUserId') && panel.includes('CAPITAINE / RESPONSABLE D’ÉQUIPE')],
  ['team panel supports logo external media vault', panel.includes('captureUserMediaFallback') && panel.includes('teamLogoMediaKey')],
  ['migration stores only lightweight logo key', migration.includes('logo_media_key text') && !migration.toLowerCase().includes('bytea')],
  ['captain can manage own roster server-side', migration.includes('v_captain_user_id is distinct from v_me')],
  ['direct group mutations revoked', migration.includes('revoke insert,update,delete on public.ms_organization_groups from authenticated')],
  ['V4 migration includes all secured team RPCs', ['ms_org_list_groups','ms_org_create_group','ms_org_update_group','ms_org_delete_group','ms_org_set_group_member'].every((x) => migration.includes(x))],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} ORGANISATIONS TEAMS V4 checks passed.`);
