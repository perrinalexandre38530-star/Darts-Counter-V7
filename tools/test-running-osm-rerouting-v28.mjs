import fs from 'node:fs';

const reroute = fs.readFileSync(new URL('../src/activity/outdoorRouteRerouting.ts', import.meta.url), 'utf8');
const moduleUi = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteNavigationPanel.tsx', import.meta.url), 'utf8');
const map = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteLiveMap.tsx', import.meta.url), 'utf8');

const checks = [
  ['rerouting engine export', reroute.includes('export async function rerouteOutdoorToRoute')],
  ['OSM local rerouter provider', reroute.includes('openstreetmap-overpass-local-rerouter')],
  ['Overpass path network fetch', reroute.includes('overpass-api.de/api/interpreter') && reroute.includes('out tags geom')],
  ['pedestrian path whitelist', reroute.includes('footway') && reroute.includes('path') && reroute.includes('track')],
  ['sport-aware path weighting', reroute.includes('preferenceFactor') && reroute.includes('sport === "trail"')],
  ['future rejoin targets', reroute.includes('futureCandidates') && reroute.includes('forwardAdvanceM')],
  ['graph pathfinding', reroute.includes('shortestPaths') && reroute.includes('reconstructPath')],
  ['snap current position to network', reroute.includes('nearestGraphNode') && reroute.includes('startSnapM')],
  ['reroute turn guidance bridge', reroute.includes('rerouteAsRunningRoute') && reroute.includes('outdoorRerouteMatchedDistanceM')],
  ['background reroute integration', moduleUi.includes('rerouteOutdoorToRoute({') && moduleUi.includes('setInterval(attemptReroute, 15_000)')],
  ['reroute voice confirmation', moduleUi.includes('Nouveau chemin calculé')],
  ['reroute direction used for voice turns', moduleUi.includes('liveOutdoorRerouteDirection') && moduleUi.includes('liveOutdoorActiveDirection')],
  ['navigation panel reroute state', panel.includes('rerouteBusy') && panel.includes('REROUTAGE OSM')],
  ['navigation panel keeps local fallback', panel.includes('localRecalc') && panel.includes('outdoorRouteRejoinPlan')],
  ['full map draws routed polyline', map.includes('rerouteLine') && map.includes('stroke="#ffad4f"')],
  ['full map reroute turn instructions', map.includes('rerouteGuidance') && map.includes('activeGuidance')],
  ['full map calculating state', map.includes('CALCUL DU CHEMIN')],
  ['fullscreen receives reroute', moduleUi.includes('reroute={liveOutdoorReroute}') && moduleUi.includes('rerouteBusy={liveOutdoorRerouteBusy}')],
];

let ok = 0;
for (const [name, pass] of checks) {
  if (pass) { ok++; console.log(`✓ ${name}`); }
  else console.error(`✗ ${name}`);
}
console.log(`\nRUNNING OSM REROUTING V28: ${ok}/${checks.length} checks passed`);
if (ok !== checks.length) process.exit(1);
