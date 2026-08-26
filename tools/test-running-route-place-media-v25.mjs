import fs from 'node:fs';

const media = fs.readFileSync('src/activity/outdoorRouteMedia.ts', 'utf8');
const places = fs.readFileSync('src/activity/outdoorRoutePlaces.ts', 'utf8');
const gallery = fs.readFileSync('src/pages/running/OutdoorRoutePhotoGallery.tsx', 'utf8');
const panel = fs.readFileSync('src/pages/running/OutdoorRoutePlaceInfoPanel.tsx', 'utf8');
const module = fs.readFileSync('src/pages/running/RunningModule.tsx', 'utf8');
const checks = [
  ['route place context service', places.includes('fetchOutdoorRoutePlaceContext')],
  ['reverse geocoding', places.includes('nominatim.openstreetmap.org/reverse')],
  ['nearby OSM POIs', places.includes('overpass-api.de/api/interpreter') && places.includes('tourism=viewpoint')],
  ['useful POI categories', places.includes('drinking_water') && places.includes('alpine_hut') && places.includes('amenity=parking')],
  ['route-distance POI ranking', places.includes('nearestRouteDistanceM')],
  ['route place cache', places.includes('mss-route-place-context-v1')],
  ['multi-anchor route photos', media.includes('routeAnchors') && media.includes('summit') && media.includes('finish')],
  ['photo distance-to-route scoring', media.includes('distanceToRouteM') && media.includes('photoScore')],
  ['Wikimedia coordinates', media.includes('imageinfo|info|coordinates')],
  ['photo lightbox', gallery.includes('role="dialog"') && gallery.includes('ArrowLeft') && gallery.includes('ArrowRight')],
  ['full-resolution photo', gallery.includes('activePhoto.imageUrl')],
  ['photo source attribution', gallery.includes('activePhoto.pageUrl') && gallery.includes('activePhoto.license')],
  ['place info panel', panel.includes('LE LIEU') && panel.includes('outdoorRoutePlaceIcon')],
  ['place panel in details', module.includes('<OutdoorRoutePlaceInfoPanel route={selectedRoute}') && module.includes('compact')],
  ['photo gallery remains integrated', module.includes('<OutdoorRoutePhotoGallery route={selectedRoute}')],
];
let ok = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK ' : 'ERR'} ${label}`);
  if (pass) ok += 1;
}
if (ok !== checks.length) process.exit(1);
console.log(`RUNNING ROUTE PLACE + MEDIA V25: ${ok}/${checks.length} checks OK`);
