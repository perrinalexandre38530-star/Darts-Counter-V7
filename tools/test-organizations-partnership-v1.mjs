import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const app = read('src/App.tsx');
const settings = read('src/pages/Settings.tsx');
const page = read('src/pages/OrganizationsPage.tsx');
const service = read('src/organizations/organizationService.ts');
const migration = read('supabase/migrations/20260907165000_partnership_organizations_v1.sql');

const checks = [
  ['Settings card', settings.includes('PARTENARIATS & ORGANISATIONS') && settings.includes('go?.("organizations")')],
  ['Dedicated route', app.includes('| "organizations"') && app.includes('case "organizations"') && app.includes('#/organizations')],
  ['Organization page', page.includes('MODE ORGANISATION') && page.includes('ÉQUIPES & GROUPES') && page.includes('AGENDA ORGANISATION')],
  ['Account-scoped persistence', service.includes('msc_organizations_v1') && service.includes('normalizeUserKey')],
  ['Create/join cloud RPC', service.includes('ms_org_create') && service.includes('ms_org_join_by_code') && service.includes('ms_org_list_mine')],
  ['Multi-tenant schema', migration.includes('ms_organizations') && migration.includes('ms_organization_members') && migration.includes('organization_id')],
  ['RLS enabled', /enable row level security/i.test(migration) && migration.includes('ms_org_has_role')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`Organizations V1: ${checks.length}/${checks.length} checks passed.`);
