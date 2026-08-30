import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const terrain = read("src/pages/running/RunningTerrain3DMap.tsx");
const profile = read("src/pages/running/RunningElevationProfile.tsx");
const module = read("src/pages/running/RunningModule.tsx");
const routeMap = read("src/pages/running/OutdoorInteractiveRouteMap.tsx");
const routeDetail = read("src/pages/running/OutdoorRouteDetailPage.tsx");

const checks = [
  ["MapLibre runtime 3D renderer", terrain.includes("maplibre-gl@") && terrain.includes("new maplibregl.Map")],
  ["DEM terrain source", terrain.includes('type: "raster-dem"') && terrain.includes("setTerrain")],
  ["hillshade relief", terrain.includes('type: "hillshade"')],
  ["GPS GeoJSON route", terrain.includes('type: "Feature"') && terrain.includes('type: "LineString"')],
  ["start/finish markers", terrain.includes("🚩") && terrain.includes("🏁")],
  ["kilometre markers", terrain.includes("for (let km = 1") && terrain.includes("KM ${km}")],
  ["POI markers", terrain.includes("places.slice") && terrain.includes("outdoorRoutePlaceIcon")],
  ["3D flyover replay", terrain.includes("SURVOL 3D") && terrain.includes("requestAnimationFrame") && terrain.includes("easeTo")],
  ["replay live metrics", terrain.includes("formatDuration") && terrain.includes("formatPace") && terrain.includes("gradePct")],
  ["2D fallback", terrain.includes("onFallback2D") && terrain.includes("REVENIR EN 2D")],
  ["interactive elevation profile", profile.includes("interactive") && profile.includes("onActivePointChange")],
  ["profile cursor synced", profile.includes("activePointIndex") && profile.includes("nearest")],
  ["saved activity 2D/3D toggle", module.includes('setMapMode("3d")') && module.includes("RunningTerrain3DMap")],
  ["live activity remains 2D by default", module.includes("zoomable={false}") || module.includes("showRouteNetwork={activitySport")],
  ["planned route 2D/3D toggle", routeMap.includes('mapMode === "3d"') && routeMap.includes("RunningTerrain3DMap")],
  ["planned route profile sync", routeDetail.includes("activeProfilePoint") && routeDetail.includes("onActivePointChange")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`OK   ${label}`);
  else { console.error(`FAIL ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} RUNNING TERRAIN 3D checks passed`);
