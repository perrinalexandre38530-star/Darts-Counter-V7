import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const terrain = read("src/pages/running/RunningTerrain3DMap.tsx");
const interactive = read("src/pages/running/OutdoorInteractiveRouteMap.tsx");
const live = read("src/pages/running/OutdoorRouteLiveMap.tsx");
const module = read("src/pages/running/RunningModule.tsx");

const checks = [
  ["real terrain only", !terrain.includes('import RunningTerrain3DCompat') && terrain.includes('map.setTerrain({ source: "terrainSource"')],
  ["DEM added after base load", terrain.indexOf('map.on("load"') < terrain.indexOf('map.addSource("terrainSource"')],
  ["hillshade terrain", terrain.includes('type: "hillshade"') && terrain.includes('hillshade-exaggeration')],
  ["3D resize observer", terrain.includes("new ResizeObserver") && terrain.includes("map.resize()")],
  ["planned map exists", interactive.includes('export default function OutdoorInteractiveRouteMap')],
  ["planned map 2D/3D", interactive.includes('mapMode === "3d"') && interactive.includes("RunningTerrain3DMap")],
  ["planned map gestures", interactive.includes("onPointerMove") && interactive.includes("onWheel") && interactive.includes('touchAction: "none"')],
  ["planned map fullscreen", interactive.includes("onFullscreen") && interactive.includes("onCloseFullscreen")],
  ["planned map styles", interactive.includes('"tourist"') && interactive.includes('"illustrated"') && interactive.includes('"light"') && interactive.includes('"night"')],
  ["POI photos", interactive.includes("fetchOutdoorPlacePhotos") && interactive.includes("PlacePopup")],
  ["live map real dimensions", live.includes("mapSize.width") && live.includes("mapSize.height") && live.includes("ResizeObserver")],
  ["saved/live generic map real dimensions", module.includes("requestedWidth") && module.includes("requestedHeight") && module.includes("mapSize.width")],
  ["no forced fake live 3D", !module.includes("preferCompat={!route && !performanceActivity}")],
];
let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`OK   ${name}`);
  else { console.error(`FAIL ${name}`); failed++; }
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} RUNNING MAPS STAGE 1 V62 checks passed`);
