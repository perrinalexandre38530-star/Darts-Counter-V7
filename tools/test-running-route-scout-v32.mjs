import fs from 'node:fs';

const scout = fs.readFileSync(new URL('../src/activity/outdoorRouteScout.ts', import.meta.url), 'utf8');
const module = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const discoverUi = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteScoutDiscover.tsx', import.meta.url), 'utf8');
const ui = `${module}\n${discoverUi}`;
const discovery = fs.readFileSync(new URL('../src/activity/outdoorRouteDiscovery.ts', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/activity/runningRoutes.ts', import.meta.url), 'utf8');
const checks = [
  ['scout engine exported', scout.includes('export async function scoutExistingOutdoorRoutes')],
  ['route scoring exported', scout.includes('export function scoreScoutedRoute')],
  ['adaptive radii', scout.includes('radiiFor(normalizedRequest)') && scout.includes('policy.radiusOptionsKm') && scout.includes('value <= 60')],
  ['dedupe by stable route key', scout.includes('outdoorRouteKey(route)')],
  ['quality reasons', scout.includes('nom officiel') && scout.includes('distance idéale')],
  ['local scout cache', scout.includes('mss-outdoor-route-scout-v3')],
  ['fitness trail discovery', discovery.includes('fitness_trail')],
  ['route scout metadata type', routes.includes('provider: "openstreetmap-route-scout" | "routeyou"')],
  ['AI Scout tab', module.includes("['scout','✦', pickLegacyLocalizedText(lang, 'SCOUT IA'") || module.includes("'scout', pickLegacyLocalizedText(lang, 'SCOUT IA'")],
  ['AI Scout action', module.includes('scoutExistingRoutes') && module.includes('scoutExistingOutdoorRoutes')],
  ['radius controls', ui.includes('searchPolicy.radiusOptionsKm') && ui.includes('searchPolicy.distanceOptionsKm')],
  ['map scout badge', module.includes('selectedRoute.scout.score')],
  ['carousel scout badge', module.includes('route.scout.score')],
  ['elevation enrichment', module.includes('result.routes.slice(0, 6)') && module.includes('enrichOutdoorRouteElevation(route)')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
