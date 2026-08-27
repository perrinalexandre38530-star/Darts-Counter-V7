import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const module = read('src/pages/running/RunningModule.tsx');
const detail = read('src/pages/running/OutdoorRouteDetailPage.tsx');
const map = read('src/pages/running/OutdoorInteractiveRouteMap.tsx');
const photos = read('src/pages/running/OutdoorRoutePhotoGallery.tsx');
const media = read('src/activity/outdoorRouteMedia.ts');

const checks = [
  ['independent route page', module.includes('OutdoorRouteDetailPage') && module.includes('routeDetailOpen')],
  ['route summary opens full page', module.includes('setRouteDetailOpen(true)')],
  ['interactive map exists', map.includes('onPointerMove') && map.includes('onWheel') && map.includes('touchAction: "none"')],
  ['fullscreen map mode', detail.includes('mapFullscreen') && detail.includes('fullscreen')],
  ['POI markers clickable', map.includes('outdoorRoutePlaceIcon') && map.includes('selectedPlace')],
  ['POI photos', map.includes('fetchOutdoorPlacePhotos') && map.includes('PlacePopup')],
  ['route actions', detail.includes('PLANIFIER') && detail.includes('GUIDER') && detail.includes('onToggleFavorite')],
  ['icon tabs', detail.includes('["overview", "▤"') && detail.includes('["photos", "▧"')],
  ['photo image changes with key', photos.includes('key={activePhoto.id}')],
  ['photo swipe', photos.includes('swipeStartRef') && photos.includes('movePhoto')],
  ['photo dedupe image url', media.includes('imageKey') && media.includes('urls.has(imageKey)')],
  ['photo request dedupe/cache', media.includes('inflightPhotoRequests') && media.includes('mss-route-photo-cache-v4')],
  ['fast GPS reuse', module.includes('Date.now() - Number(cachedPoint.timestamp || 0) < 90_000')],
  ['route page wider', module.includes('setupPanel === "route" ? 1280')],
  ['map summary moved below map', module.includes('Touchez la carte pour ouvrir la fiche complète')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) { failed++; console.error(`FAIL ${name}`); }
  else console.log(`OK   ${name}`);
}
if (failed) process.exit(1);
console.log(`${checks.length}/${checks.length} checks passed`);
