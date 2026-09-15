import fs from 'node:fs';
const service=fs.readFileSync('src/organizations/organizationService.ts','utf8');
const admin=fs.readFileSync('src/components/OrganizationAdminPanel.tsx','utf8');
const plans=fs.readFileSync('src/components/OrganizationPlansPanel.tsx','utf8');
const page=fs.readFileSync('src/pages/OrganizationsPage.tsx','utf8');
const checks=[
  ['admin settings type',service.includes('export type OrganizationAdminSettings =')],
  ['settings stored in light profile',service.includes('adminSettings: OrganizationAdminSettings') && service.includes('updateOrganizationAdminSettings')],
  ['no new admin table',!service.includes('ms_organization_admin_settings') && !service.includes('ms_organization_plan_requests')],
  ['admin panel wired',page.includes('OrganizationAdminPanel') && page.includes('view === "admin"')],
  ['plans panel wired',page.includes('OrganizationPlansPanel') && page.includes('view === "offers"')],
  ['join code rotate',admin.includes('rotateOrganizationJoinCode')],
  ['config export',admin.includes('mss-organization-config-v1') && admin.includes('Blob')],
  ['storage guardrail',admin.includes('Aucune carte bancaire') && admin.includes('Supabase')],
  ['module presentation controls',admin.includes('enabledModules') && page.includes('optionalModules')],
  ['compact dashboard',admin.includes('compactDashboard') && page.includes('compactDashboard')],
  ['plan request',plans.includes('requestedPlan') && plans.includes('DEMANDER CETTE OFFRE')],
  ['no auto billing claim',plans.includes('Aucune facturation') || plans.includes('No billing')],
  ['owner-only plan request',plans.includes('organization.role === "owner"')],
  ['no sql migration v10',!fs.existsSync('supabase/migrations/20260915173000_partnership_organizations_admin_offers_v10.sql')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
