import fs from 'node:fs';

const checks = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const service = read('src/organizations/organizationService.ts');
const page = read('src/pages/OrganizationsPage.tsx');
const app = read('src/App.tsx');
const migration = read('supabase/migrations/20260914172000_partnership_organizations_communication_federations_v7.sql');
const comm = read('src/components/OrganizationCommunicationPanel.tsx');
const fed = read('src/components/OrganizationFederationsPanel.tsx');
const ok = (name, value) => checks.push([name, Boolean(value)]);

ok('announcement type', service.includes('export type OrganizationAnnouncement ='));
ok('federation link type', service.includes('export type OrganizationFederationLink ='));
ok('announcement RPC service', service.includes('ms_org_list_announcements') && service.includes('ms_org_create_announcement'));
ok('federation RPC service', service.includes('ms_org_list_federation_links') && service.includes('ms_org_upsert_federation_link'));
ok('communication panel mounted', page.includes('<OrganizationCommunicationPanel'));
ok('federation panel mounted', page.includes('<OrganizationFederationsPanel'));
ok('deep routes', app.includes('organization_communication') && app.includes('organization_federations'));
ok('communication size cap', migration.includes('char_length(body) between 1 and 1200'));
ok('announcement feed limit', migration.includes('limit 80'));
ok('no federation secrets in db', migration.includes('Les futurs secrets connecteurs restent côté serveur'));
ok('write enabled immutable from client', migration.includes('write_enabled est volontairement immuable depuis le client'));
ok('no result duplication table', !migration.includes('create table if not exists public.ms_organization_federation_results'));
ok('result package uses resultRef', fed.includes('resultRef: selectedFixture.resultRef'));
ok('captain scoped announcements', migration.includes('g.captain_user_id=v_me'));
ok('media warning', comm.includes('aucun fichier ni média'));

for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, pass]) => !pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
