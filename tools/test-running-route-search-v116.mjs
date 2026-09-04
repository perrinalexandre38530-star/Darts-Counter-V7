import fs from "node:fs";

const policy = fs.readFileSync(new URL("../src/activity/outdoorRouteSearchPolicy.ts", import.meta.url), "utf8");
const discovery = fs.readFileSync(new URL("../src/activity/outdoorRouteDiscovery.ts", import.meta.url), "utf8");
const scout = fs.readFileSync(new URL("../src/activity/outdoorRouteScout.ts", import.meta.url), "utf8");
const moduleUi = fs.readFileSync(new URL("../src/pages/running/RunningModule.tsx", import.meta.url), "utf8");
const scoutUi = fs.readFileSync(new URL("../src/pages/running/OutdoorRouteScoutDiscover.tsx", import.meta.url), "utf8");

const checks = [
  ["discipline policies", policy.includes("running: {") && policy.includes("walking: {") && policy.includes("hiking: {") && policy.includes("trail: {")],
  ["walking target differs from running", policy.includes("defaultTargetKm: 6") && policy.includes("defaultTargetKm: 10")],
  ["hard distance tolerance", policy.includes("const hardTolerance = 0.45")],
  ["no tiny OSM fragments", discovery.includes("absoluteMinM") && discovery.includes("distanceM < absoluteMinM")],
  ["longest relation chain", discovery.includes("segmentDistance(b) - segmentDistance(a)") && discovery.includes("const route = chains[0]")],
  ["tagged-distance fragment rejection", discovery.includes("taggedDistanceM") && discovery.includes("taggedDistanceM * 0.42")],
  ["sport-aware scoring", scout.includes("function sportAffinity") && scout.includes('sport === "trail"') && scout.includes('sport === "walking"')],
  ["distance-aware filtering", scout.includes("routeFitsOutdoorScoutRequest") && scout.includes("outdoorRouteDistanceFit")],
  ["adaptive radius expands", scout.includes("radiiFor(normalizedRequest)") && scout.includes("policy.radiusOptionsKm")],
  ["community source included", scout.includes("fetchNearbyCommunityRoutes")],
  ["generated fallback", scout.includes("generateOutdoorRoutes") && scout.includes("fallback-generated")],
  ["cache version bumped", scout.includes("mss-outdoor-route-scout-v3")],
  ["nearby uses unified scout engine", moduleUi.includes("const discoverNearbyRoutes") && moduleUi.includes("targetDistanceKm: routeGenerationDistanceKm")],
  ["sport defaults reset", moduleUi.includes("setRouteGenerationDistanceKm(policy.defaultTargetKm)") && moduleUi.includes("setRouteGenerationProfile(policy.defaultProfile)")],
  ["dynamic route options", moduleUi.includes("routeSearchPolicy.distanceOptionsKm") && moduleUi.includes("routeSearchPolicy.radiusOptionsKm")],
  ["scout UI uses sport policy", scoutUi.includes("outdoorRouteSearchPolicy(sport)") && scoutUi.includes("searchPolicy.distanceOptionsKm")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
