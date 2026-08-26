import fs from 'node:fs';

const scout = fs.readFileSync(new URL('../src/activity/outdoorRouteScout.ts', import.meta.url), 'utf8');
const module = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const discovery = fs.readFileSync(new URL('../src/activity/outdoorRouteDiscovery.ts', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/activity/runningRoutes.ts', import.meta.url), 'utf8');
const checks = [
  ['scout engine exported', scout.includes('export async function scoutExistingOutdoorRoutes')],
  ['route scoring exported', scout.includes('export function scoreScoutedRoute')],
  ['adaptive radii', scout.includes('radiiFor(request)') && scout.includes('Math.min(40')],
  ['dedupe by stable route key', scout.includes('outdoorRouteKey(route)')],
  ['quality reasons', scout.includes('nom officiel') && scout.includes('distance très proche')],
  ['local scout cache', scout.includes('mss-outdoor-route-scout-v1')],
  ['fitness trail discovery', discovery.includes('fitness_trail')],
  ['route scout metadata type', routes.includes('provider: "openstreetmap-route-scout" | "routeyou"')],
  ['AI Scout tab', module.includes("'scout', pickLegacyLocalizedText(lang, 'SCOUT IA'" )],
  ['AI Scout action', module.includes('scoutExistingRoutes') && module.includes('scoutExistingOutdoorRoutes')],
  ['radius controls', module.includes('[10,20,35].map')],
  ['map scout badge', module.includes('selectedRoute.scout.score')],
  ['carousel scout badge', module.includes('route.scout.score')],
  ['elevation enrichment', module.includes('result.routes.slice(0, 6)') && module.includes('enrichOutdoorRouteElevation(route)')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
