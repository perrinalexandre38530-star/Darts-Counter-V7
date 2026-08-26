import fs from 'node:fs';

const nav = fs.readFileSync(new URL('../src/activity/outdoorNavigation.ts', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteNavigationPanel.tsx', import.meta.url), 'utf8');
const map = fs.readFileSync(new URL('../src/pages/running/OutdoorRouteLiveMap.tsx', import.meta.url), 'utf8');
const moduleUi = fs.readFileSync(new URL('../src/pages/running/RunningModule.tsx', import.meta.url), 'utf8');

const checks = [
  ['rejoin plan type', nav.includes('export type OutdoorRouteRejoinPlan')],
  ['rejoin plan engine', nav.includes('export function outdoorRouteRejoinPlan')],
  ['rejoin selects future route', nav.includes('minTargetM') && nav.includes('forwardAdvanceM')],
  ['rejoin recalculated remaining', nav.includes('recalculatedRemainingM')],
  ['full screen map component', map.includes('export default function OutdoorRouteLiveMap')],
  ['planned route trace', map.includes('routeLine') && map.includes('stroke={accent}')],
  ['actual GPS track trace', map.includes('trackLine')],
  ['live position marker', map.includes('movementBearing') && map.includes('▲')],
  ['turn instruction HUD', map.includes('turnLabel') && map.includes('instructionDistanceM')],
  ['off-route visual alert', map.includes('OFF ROUTE') && map.includes('HORS TRACÉ')],
  ['local rejoin overlay', map.includes('RECALCUL LOCAL') && map.includes('rejoin.distanceToTargetM')],
  ['zoom controls', map.includes('setZoomDelta') && map.includes('>+</button>')],
  ['follow/overview modes', map.includes('setFollow') && map.includes('VUE GLOBALE')],
  ['escape closes map', map.includes('event.key === "Escape"')],
  ['navigation panel map button', panel.includes('onOpenMap') && panel.includes('CARTE PLEIN ÉCRAN')],
  ['navigation panel rejoin card', panel.includes('outdoorRouteRejoinPlan') && panel.includes('REJOINDRE LE TRACÉ')],
  ['running navigation enabled', moduleUi.includes('activitySport !== "treadmill" ? outdoorRouteProgress')],
  ['two-stage voice turn prompts', moduleUi.includes('announceTurn(260, "early")') && moduleUi.includes('announceTurn(80, "near")')],
  ['fullscreen integration', moduleUi.includes('<OutdoorRouteLiveMap') && moduleUi.includes('liveRouteMapFullscreen')],
];

let ok = 0;
for (const [name, pass] of checks) {
  if (pass) { ok++; console.log(`✓ ${name}`); }
  else console.error(`✗ ${name}`);
}
console.log(`\nRUNNING ACTIVE NAVIGATION V27: ${ok}/${checks.length} checks passed`);
if (ok !== checks.length) process.exit(1);
