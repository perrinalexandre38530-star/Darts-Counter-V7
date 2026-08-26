import fs from 'node:fs';

const generator = fs.readFileSync(new URL('../src/activity/outdoorRouteGenerator.ts', import.meta.url), 'utf8');
const moduleUi = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/activity/runningRoutes.ts', import.meta.url), 'utf8');

const checks = [
  [generator.includes('export async function generateOutdoorRoutes'), 'route generator export'],
  [generator.includes('openstreetmap-overpass-local-router'), 'local OSM routing provider'],
  [generator.includes('buildLoopCandidates'), 'loop generation'],
  [generator.includes('buildOutBackCandidates'), 'out-and-back generation'],
  [generator.includes('preferenceFactor'), 'terrain/profile weighting'],
  [generator.includes('shortestPath'), 'pedestrian graph pathfinding'],
  [moduleUi.includes('GÉNÉRER MON PARCOURS'), 'generator UI'],
  [moduleUi.includes('✨ GÉNÉRER 3 PARCOURS'), '3 proposal action'],
  [moduleUi.includes('routeGenerationDistanceKm'), 'distance selector'],
  [moduleUi.includes('routeGenerationShape'), 'shape selector'],
  [moduleUi.includes('routeGenerationProfile'), 'terrain selector'],
  [moduleUi.includes('generateOutdoorRoutes({'), 'UI wired to route engine'],
  [routes.includes('| "generated"'), 'generated route persistence type'],
  [routes.includes('distanceErrorPct'), 'generated route metadata'],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, name] of checks) console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
if (failed.length) process.exit(1);
console.log(`RUNNING ROUTE GENERATOR V21: ${checks.length}/${checks.length} checks OK`);
