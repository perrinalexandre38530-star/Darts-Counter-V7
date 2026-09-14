import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const service = read('src/organizations/organizationService.ts');
const panel = read('src/components/OrganizationCompetitionsPanel.tsx');
const page = read('src/pages/OrganizationsPage.tsx');
const migration = read('supabase/migrations/20260914134500_partnership_organizations_competitions_v5.sql');

const checks = [
  ['competition panel integrated', page.includes('OrganizationCompetitionsPanel') && page.includes('view === "competitions"')],
  ['competition CRUD RPC client', ['ms_org_list_competitions','ms_org_create_competition','ms_org_get_competition','ms_org_set_competition_status','ms_org_delete_competition'].every((x) => service.includes(x))],
  ['fixture RPC client', ['ms_org_generate_competition_fixtures','ms_org_create_competition_fixture','ms_org_set_competition_fixture_result'].every((x) => service.includes(x))],
  ['functional creation UI', panel.includes('CRÉER LA COMPÉTITION') && panel.includes('participantMode') && panel.includes('selectedEntityIds')],
  ['team and individual participants', panel.includes('value="teams"') && panel.includes('value="individuals"')],
  ['schedule generation and manual fixtures', panel.includes('GÉNÉRER LE CALENDRIER') && panel.includes('AJOUTER UNE RENCONTRE')],
  ['summary result only', panel.includes('SAISIR LE RÉSULTAT') && panel.includes('resultRef') && panel.includes('Score résumé')],
  ['three lightweight relational tables', ['ms_organization_competitions','ms_organization_competition_participants','ms_organization_competition_fixtures'].every((x) => migration.includes(x))],
  ['no heavy media or stats blobs in Supabase', !/bytea|base64|image_data|photo_data|video_data|stats_blob|history_blob/i.test(migration)],
  ['short result reference enforced', migration.includes('char_length(result_ref) <= 180') && migration.includes('char_length(score_label) <= 60')],
  ['direct mutations revoked', ['ms_organization_competitions','ms_organization_competition_participants','ms_organization_competition_fixtures'].every((x) => migration.includes(`revoke insert,update,delete on public.${x} from authenticated`))],
  ['server role protections', migration.includes("array['owner','admin','manager']")],
  ['round robin + knockout generation', migration.includes("v_format='league'") && migration.includes("v_format='knockout'") && migration.includes("v_format='groups_knockout'")],
  ['R2/NAS external storage rule documented', panel.includes('R2 / NAS / stockage choisi') && migration.includes('R2 / NAS / stockage choisi')],
];

let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} ORGANISATIONS COMPETITIONS V5 checks passed.`);
