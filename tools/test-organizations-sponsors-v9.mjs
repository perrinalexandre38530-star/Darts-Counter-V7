import fs from 'node:fs';
const service=fs.readFileSync('src/organizations/organizationService.ts','utf8');
const panel=fs.readFileSync('src/components/OrganizationSponsorsPanel.tsx','utf8');
const page=fs.readFileSync('src/pages/OrganizationsPage.tsx','utf8');
const sql=fs.readFileSync('supabase/migrations/20260914180500_partnership_organizations_sponsors_v9.sql','utf8');
const checks=[
  ['partner type',service.includes('export type OrganizationPartner =')],
  ['list rpc',service.includes('ms_org_list_partners')],
  ['create rpc',service.includes('ms_org_create_partner')],
  ['update rpc',service.includes('ms_org_update_partner')],
  ['status rpc',service.includes('ms_org_set_partner_status')],
  ['delete rpc',service.includes('ms_org_delete_partner')],
  ['panel wired',page.includes('OrganizationSponsorsPanel') && page.includes('view === "sponsors"')],
  ['external media',panel.includes('captureUserMediaFallback') && panel.includes('teamLogoMediaKey(`sponsor-${partner.id}`)')],
  ['single table',sql.includes('create table if not exists public.ms_organization_partners')],
  ['no bytea',!sql.match(/\bbytea\b/i)],
  ['logo key only',sql.includes('logo_media_key text') && !sql.includes('logo_blob')],
  ['rls enabled',sql.includes('enable row level security')],
  ['direct writes revoked',sql.includes('revoke insert,update,delete on public.ms_organization_partners from authenticated')],
  ['member visibility',sql.includes("p.status='active'") && sql.includes('ms_organization_group_members')],
  ['bounded list',sql.includes('limit 100;')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`${ok}/${checks.length}`);
if(ok!==checks.length) process.exit(1);
