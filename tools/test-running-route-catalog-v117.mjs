import fs from 'node:fs';
const discovery = fs.readFileSync('src/activity/outdoorRouteDiscovery.ts','utf8');
const scout = fs.readFileSync('src/activity/outdoorRouteScout.ts','utf8');
const moduleText = fs.readFileSync('src/pages/running/RunningModule.tsx','utf8');
const api = fs.readFileSync('functions/api/running/routes/catalog.ts','utf8');
const checks = [
  ['same-origin catalogue endpoint', discovery.includes('/api/running/routes/catalog?')],
  ['direct Overpass fallback kept', discovery.includes('return fetchOverpass(overpassQuery(center, sport, radiusKm), signal)')],
  ['global catalogue provider', discovery.includes('mss-global-route-catalog')],
  ['discovery widened to 60 km', discovery.includes('Math.min(60, Math.round(radiusKm))')],
  ['more referenced results', discovery.includes('MAX_DISCOVERED_ROUTES = 64')],
  ['scout cache v3', scout.includes('mss-outdoor-route-scout-v3')],
  ['scout max 48', scout.includes('MAX_RESULTS = 48')],
  ['progressive 60 km search', scout.includes('25, 40, 60')],
  ['generated fallback up to 8', scout.includes('Math.min(8, minResults - ranked.length)')],
  ['referenced route bonus', scout.includes('parcours référencé')],
  ['hub asks for rich scout result', moduleText.includes('minResults: 18') && moduleText.includes('minResults: 16')],
  ['edge cache present', api.includes('caches.default') && api.includes('CACHE_TTL_SECONDS')],
  ['multiple Overpass mirrors', api.includes('overpass.private.coffee') && api.includes('overpass.kumi.systems') && api.includes('overpass-api.de')],
  ['server route query is discipline-aware', api.includes('routeKindsForSport') && api.includes('nordic_walking')],
  ['server radius max 60', api.includes('Math.min(60, radiusKm)')],
];
let pass=0;
for (const [name, ok] of checks) { console.log(`${ok?'✓':'✗'} ${name}`); if(ok) pass++; }
console.log(`\n${pass}/${checks.length} checks passed`);
if (pass !== checks.length) process.exit(1);
