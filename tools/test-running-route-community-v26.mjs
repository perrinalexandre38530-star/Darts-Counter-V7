import fs from 'node:fs';

const service = fs.readFileSync(new URL('../src/activity/outdoorRouteSocial.ts', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteSocialPanel.tsx', import.meta.url), 'utf8');
const module = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260826_running_route_community_v2.sql', import.meta.url), 'utf8');

const checks = [
  ['community tab', module.includes("'community'") && module.includes('OutdoorRouteSocialPanel')],
  ['route reviews service', service.includes('submitOutdoorRouteReview') && service.includes('ms_upsert_running_route_review')],
  ['conditions service', service.includes('postOutdoorRouteCondition') && service.includes('ms_post_running_route_condition')],
  ['hazards service', service.includes('postOutdoorRouteHazard') && service.includes('ms_post_running_route_hazard')],
  ['outings service', service.includes('createOutdoorRouteOuting') && service.includes('joinOutdoorRouteOuting')],
  ['user photo upload', service.includes('route-community') && service.includes('uploadOutdoorRouteCommunityPhoto')],
  ['social feed', service.includes('ms_running_route_social_feed')],
  ['review UI', panel.includes('TON AVIS') && panel.includes('DIFFICULTÉ RESSENTIE')],
  ['trail condition UI', panel.includes('ÉTAT DU TERRAIN') && panel.includes('CONDITION_ICONS')],
  ['hazard UI', panel.includes('SIGNALER UN PROBLÈME') && panel.includes('HAZARD_ICONS')],
  ['outing UI', panel.includes('ORGANISER UNE SORTIE') && panel.includes('REJOINDRE')],
  ['photo UI', panel.includes('PHOTOS DES UTILISATEURS') && panel.includes('accept="image/*"')],
  ['review table', migration.includes('ms_running_route_reviews')],
  ['condition table', migration.includes('ms_running_route_conditions')],
  ['hazard table', migration.includes('ms_running_route_hazards')],
  ['outings tables', migration.includes('ms_running_route_outings') && migration.includes('ms_running_route_outing_members')],
  ['photos table', migration.includes('ms_running_route_photos')],
  ['storage bucket', migration.includes("'route-community'") && migration.includes('storage.foldername')],
  ['authenticated RPC grants', migration.includes('grant execute on function public.ms_running_route_social_feed')],
];

let ok = 0;
for (const [name, pass] of checks) {
  if (pass) { ok++; console.log(`✓ ${name}`); }
  else console.error(`✗ ${name}`);
}
console.log(`\n${ok}/${checks.length} checks passed`);
if (ok !== checks.length) process.exit(1);
