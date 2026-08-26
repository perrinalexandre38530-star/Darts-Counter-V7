import fs from 'node:fs';

const generator = fs.readFileSync(new URL('../src/activity/outdoorRouteGenerator.ts', import.meta.url), 'utf8');
const elevation = fs.readFileSync(new URL('../src/activity/outdoorRouteElevation.ts', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/activity/runningRoutes.ts', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/activity/outdoorRouteCommunity.ts', import.meta.url), 'utf8');
const media = fs.readFileSync(new URL('../src/activity/outdoorRouteMedia.ts', import.meta.url), 'utf8');

const checks = [
  [generator.includes('elevationGainMinM?: number | null'), 'generator accepts minimum D+'],
  [generator.includes('elevationGainMaxM?: number | null'), 'generator accepts maximum D+'],
  [generator.includes('normalizeOutdoorElevationTarget'), 'D+ target normalization'],
  [generator.includes('outdoorElevationTargetError'), 'D+ target error scoring'],
  [generator.includes('enrichOutdoorRoutesElevation'), 'candidate elevation enrichment'],
  [generator.includes('candidatePoolSize'), 'larger candidate pool for D+ ranking'],
  [generator.includes('elevationTargetMatched'), 'D+ match metadata'],
  [generator.includes('open-meteo-copernicus-dem'), 'elevation source metadata'],
  [elevation.includes('export async function enrichOutdoorRoutesElevation'), 'bounded multi-route elevation enrichment'],
  [routes.includes('elevationGainMinM?: number'), 'route persistence supports D+ target'],
  [ui.includes('CIBLER LE DÉNIVELÉ POSITIF'), 'D+ target UI'],
  [ui.includes('routeGenerationElevationEnabled'), 'D+ UI toggle state'],
  [ui.includes('elevationGainMinM: routeGenerationElevationEnabled'), 'UI passes min D+ to engine'],
  [ui.includes('elevationGainMaxM: routeGenerationElevationEnabled'), 'UI passes max D+ to engine'],
  [ui.includes('OutdoorRoutePhotoGallery'), 'V23 photo gallery rebased'],
  [ui.includes('OutdoorRouteCommunityPanel'), 'V23 community performance panel rebased'],
  [community.includes('ms_running_route_leaderboard'), 'community leaderboard RPC'],
  [media.includes('commons.wikimedia.org'), 'Wikimedia place imagery'],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, name] of checks) console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
if (failed.length) process.exit(1);
console.log(`RUNNING ROUTE ELEVATION TARGET V24: ${checks.length}/${checks.length} checks OK`);
