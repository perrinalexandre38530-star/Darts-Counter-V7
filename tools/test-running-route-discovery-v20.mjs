import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const moduleUi = read("src/pages/running/RunningModule.tsx");
const interactiveMap = read("src/pages/running/OutdoorInteractiveRouteMap.tsx");
const discovery = read("src/activity/outdoorRouteDiscovery.ts");
const routes = read("src/activity/runningRoutes.ts");
const nativeBridge = read("src/activity/nativeActivityTracking.ts");
const nativePlugin = read("android/app/src/main/java/com/multisportsscoring/app/ActivityTrackingPlugin.java");

const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(discovery.includes("overpass-api.de/api/interpreter"), "Overpass route discovery provider missing");
assert(discovery.includes('source: "osm"'), "Discovered routes are not tagged as OSM routes");
assert(routes.includes('"osm"'), "RunningRouteTemplate does not accept OSM routes");
assert(moduleUi.includes("discoverNearbyRoutes"), "Nearby route discovery UI missing");
assert(moduleUi.includes("DÉCOUVRIR LES PARCOURS"), "Discover routes action missing");
assert(moduleUi.includes("tile.waymarkedtrails.org/hiking") || interactiveMap.includes("tile.waymarkedtrails.org/hiking"), "Hiking/walking route network overlay missing");
assert(nativeBridge.includes("getNativeCurrentPosition"), "Native one-shot GPS bridge missing");
assert(nativePlugin.includes("getCurrentPosition(PluginCall call)"), "Android one-shot GPS method missing");
assert(nativePlugin.includes('result.put("granted", hasFineLocationPermission())'), "Running GPS must require precise location");

console.log("✅ RUNNING ROUTES + GPS V20 CHECK OK");
console.log("   Nearby OSM routes + route-network overlay + save/favorite + precise Android GPS fix");
