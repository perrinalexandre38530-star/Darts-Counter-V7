import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const service = read('src/organizations/organizationService.ts');
const page = read('src/pages/OrganizationsPage.tsx');
const venue = read('src/components/OrganizationVenuePanel.tsx');
const landing = read('src/pages/OrganizationVenueLandingPage.tsx');
const board = read('src/pages/OrganizationVenueBoardPage.tsx');
const context = read('src/organizations/organizationPlayContext.ts');
const app = read('src/App.tsx');
const switcher = read('src/components/OrganizationWorkspaceSwitcher.tsx');
const migration = read('supabase/migrations/20260917152000_partnership_organizations_venue_final_v11.sql');

const checks = [
  ['installation type + model', service.includes('OrganizationInstallationKind') && service.includes('OrganizationInstallation')],
  ['installation CRUD RPC client', ['ms_org_list_installations','ms_org_create_installation','ms_org_update_installation','ms_org_delete_installation'].every(x => service.includes(x))],
  ['QR rotate + resolve client', service.includes('ms_org_rotate_installation_qr') && service.includes('ms_org_resolve_installation_qr')],
  ['venue panel mounted', page.includes('OrganizationVenuePanel') && page.includes('view === "venue"')],
  ['QR preview + PNG export', venue.includes('generateQrCanvas') && venue.includes('TÉLÉCHARGER QR')],
  ['play context activation', venue.includes('activateOrganizationPlayContext') && landing.includes('ACTIVER CE LIEU ET JOUER')],
  ['deep scan route', app.includes('#/venue/') && app.includes('organization_venue_scan')],
  ['TV leaderboard route', app.includes('#/venue-board/') && app.includes('organization_venue_board') && board.includes('LIVE VENUE')],
  ['history tagged centrally', app.includes('applyOrganizationPlayContext(saved)') && context.includes('organizationContext')],
  ['stale venue context cleared on workspace switch', switcher.includes('clearOrganizationPlayContext')],
  ['single lightweight venue table', migration.includes('create table if not exists public.ms_organization_installations')],
  ['QR token unique', /qr_token text not null unique/i.test(migration)],
  ['no heavy venue media/stats columns', !/\b(bytea|image_data|photo_data|stats_json|history_json)\b/i.test(migration)],
  ['direct writes revoked', migration.includes('revoke insert,update,delete on public.ms_organization_installations from authenticated')],
  ['authenticated QR only', migration.includes('grant execute on function public.ms_org_resolve_installation_qr(text) to authenticated') && !migration.includes('to anon')],
  ['bounded installation list', migration.includes('limit 200')],
  ['no venue result history table', !migration.includes('ms_organization_venue_results') && !migration.includes('ms_organization_venue_matches')],
  ['usage is aggregate counter only', migration.includes('play_count bigint') && migration.includes('ms_org_touch_installation')],
  ['final module keeps existing organization subsystems', ['OrganizationMembersPanel','OrganizationTeamsPanel','OrganizationCompetitionsPanel','OrganizationStatsPanel','OrganizationCommunicationPanel','OrganizationFederationsPanel','OrganizationBillingPanel','OrganizationSponsorsPanel','OrganizationAdminPanel','OrganizationPlansPanel'].every(x => page.includes(x))],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`${checks.length}/${checks.length} ORGANISATIONS VENUE FINAL V11 checks passed.`);
