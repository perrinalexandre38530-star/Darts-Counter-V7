import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const moduleSrc = read('src/pages/running/RunningModule.tsx');
const detailSrc = read('src/pages/running/OutdoorRouteDetailPage.tsx');
const css = read('src/pages/running/runningResponsive.css');
const shared = read('src/activity/runningShared.ts');

const checks = [];
const check = (name, condition) => checks.push([name, Boolean(condition)]);

check('detail: new summary card', detailSrc.includes('running-route-summary-card'));
check('detail: primary guidance CTA', detailSrc.includes('running-route-primary-guide'));
check('detail: about route section', detailSrc.includes('À PROPOS DU PARCOURS'));
check('detail: source + description metadata', detailSrc.includes('routeSource') && detailSrc.includes('routeDescription'));

check('generator: one-line container', moduleSrc.includes('className="running-generator-line"'));
check('generator: reusable groups', moduleSrc.includes('function GeneratorSelectionGroup') && moduleSrc.includes('function GeneratorChip'));
check('generator: distance / shape / terrain / D+ controls', ['DISTANCE', 'FORME', 'TERRAIN', 'label="D+"'].every((needle) => moduleSrc.includes(needle)));
check('route modes: Scout is in compact row', moduleSrc.includes("['scout','✦'") && moduleSrc.includes('flex: active ? "1 0 auto" : "0 0 36px"'));

check('css: generator row never wraps', /\.running-generator-line\s*\{[^}]*flex-wrap\s*:\s*nowrap/s.test(css));
check('css: one primary route-modes rule', (css.match(/^\.running-route-modes\s*\{/gm) || []).length === 1);
check('css: detail tab strip exists', css.includes('.running-route-detail-tabs'));

for (const exportName of [
  'clampRunningNumber',
  'pickRunningText',
  'runningCoordKey',
  'runningLocalDateKey',
  'loadRunningArrayCache',
  'saveRunningLocalJson',
  'runningPointElapsedMs',
  'isStandardRunningRaceDistance',
  'looksMissingRunningRpc',
  'outdoorWaypointIcon',
  'runningMercatorPixel',
  'runningMercatorLatLon',
]) check(`shared helper: ${exportName}`, shared.includes(`export function ${exportName}`));

const noLocalFn = (path, name) => !new RegExp(`function\\s+${name}\\s*\\(`).test(read(path));
const uiPickTextFiles = [
  'src/pages/running/OutdoorRouteDetailPage.tsx',
  'src/pages/running/RunningElevationProfile.tsx',
  'src/pages/running/RunningTerrain3DCompat.tsx',
  'src/pages/running/RunningActivityPerformancePanel.tsx',
  'src/pages/running/RunningTerrain3DMap.tsx',
  'src/pages/running/OutdoorRouteScoutDiscover.tsx',
  'src/pages/running/OutdoorInteractiveRouteMap.tsx',
];
check('dedupe: no local pickText helpers', uiPickTextFiles.every((path) => noLocalFn(path, 'pickText')));

const mercatorFiles = fs.readdirSync('src/pages/running').filter((name) => name.endsWith('.tsx')).map((name) => `src/pages/running/${name}`);
check('dedupe: no local mercatorPixel helpers', mercatorFiles.every((path) => noLocalFn(path, 'mercatorPixel')));
check('dedupe: no local mercatorLatLon helpers', mercatorFiles.every((path) => noLocalFn(path, 'mercatorLatLon')));

check('dedupe: no local coordKey in generator/rerouting', [
  'src/activity/outdoorRouteGenerator.ts',
  'src/activity/outdoorRouteRerouting.ts',
].every((path) => noLocalFn(path, 'coordKey')));
check('dedupe: no local validDistance in goals/calendar', [
  'src/activity/runningGoals.ts',
  'src/activity/runningRaceCalendar.ts',
].every((path) => noLocalFn(path, 'validDistance')));
check('dedupe: no local looksMissingRpc in community/social', [
  'src/activity/outdoorRouteCommunity.ts',
  'src/activity/outdoorRouteSocial.ts',
].every((path) => noLocalFn(path, 'looksMissingRpc')));

check('dedupe: shared local-date key replaces UI/activity copies', [
  ['src/activity/runningInsights.ts', 'dayKey'],
  ['src/pages/running/RunningRaceCalendarView.tsx', 'dateValue'],
  ['src/pages/running/RunningActivityCalendar.tsx', 'keyOf'],
].every(([path, name]) => noLocalFn(path, name)));
check('dedupe: shared point elapsed helper replaces copies', [
  ['src/activity/runningElevation.ts', 'elapsedAtPoint'],
  ['src/pages/running/RunningTerrain3DMap.tsx', 'pointElapsedMs'],
].every(([path, name]) => noLocalFn(path, name)));
check('dedupe: shared JSON persistence replaces exact save copies', [
  ['src/activity/outdoorRouteExtras.ts', 'saveAll'],
  ['src/pages/running/OutdoorSafetyPanel.tsx', 'savePrefs'],
].every(([path, name]) => noLocalFn(path, name)));
check('dedupe: shared array cache replaces exact load copies', [
  'src/activity/outdoorRouteMedia.ts',
  'src/activity/outdoorRoutePlaces.ts',
].every((path) => noLocalFn(path, 'loadCache')));

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (ok) passed++;
}
console.log(`\n${passed}/${checks.length} checks passed`);
if (passed !== checks.length) process.exit(1);
