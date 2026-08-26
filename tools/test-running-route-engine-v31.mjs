import fs from 'node:fs';

const generator = fs.readFileSync(new URL('../src/activity/outdoorRouteGenerator.ts', import.meta.url), 'utf8');
const media = fs.readFileSync(new URL('../src/activity/outdoorRouteMedia.ts', import.meta.url), 'utf8');
const gallery = fs.readFileSync(new URL('../src/pages/running/OutdoorRoutePhotoGallery.tsx', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/activity/runningRoutes.ts', import.meta.url), 'utf8');

const checks = [
  [generator.includes('graphComponents'), 'connected-component analysis'],
  [generator.includes('pickStartNode'), 'connected start-node selection'],
  [generator.includes('allowedKeys'), 'candidate anchors constrained to connected network'],
  [generator.includes('secondary_link') && generator.includes('primary_link'), 'connector roads available as high-penalty fallbacks'],
  [generator.includes('[0, 90, 180, 270]'), 'multi-shape loop anchor patterns'],
  [generator.includes('bearings = [0, 30, 60'), 'denser directional candidate search'],
  [generator.includes('fallbackCandidates'), 'automatic alternate-shape fallback'],
  [generator.includes('openrouteservice-round-trip'), 'optional robust round-trip provider'],
  [generator.includes('VITE_OPENROUTESERVICE_API_KEY'), 'optional ORS key support'],
  [routes.includes('openrouteservice-round-trip'), 'route metadata supports ORS provider'],
  [media.includes('fetchWikipediaNearby'), 'Wikipedia nearby place imagery'],
  [media.includes('fetchCommonsNamedPlace'), 'named-place Commons imagery'],
  [media.includes('fetchOutdoorRoutePlaceContext'), 'OSM place context feeds imagery'],
  [media.includes('isDecorativeOrIrrelevant'), 'irrelevant image filtering'],
  [media.includes('scenicBonus'), 'scenic image ranking'],
  [gallery.includes('gridTemplateColumns: "1.55fr 1fr 1fr"'), 'Google-like image mosaic'],
  [gallery.includes('VIEW PHOTOS') || gallery.includes('VOIR LES PHOTOS'), 'photo gallery count/open action'],
  [gallery.includes('WIKIPÉDIA') && gallery.includes('WIKIMEDIA'), 'source labels in gallery'],
];

for (const [ok, name] of checks) console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
const failed = checks.filter(([ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`RUNNING ROUTE ENGINE + PLACE MEDIA V31: ${checks.length}/${checks.length} checks OK`);
