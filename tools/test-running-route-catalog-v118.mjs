import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const api = read("functions/api/running/routes/catalog.ts");
const discovery = read("src/activity/outdoorRouteDiscovery.ts");
const scout = read("src/activity/outdoorRouteScout.ts");
const routes = read("src/activity/runningRoutes.ts");
const migration = read("supabase/migrations/20260904_running_route_catalog_v1.sql");
const importer = read("tools/import-running-route-catalog-gpx.mjs");

const checks = [
  ["catalog v3 header", api.includes('x-mss-route-catalog": "v3')],
  ["persistent Supabase search", api.includes("ms_search_running_route_catalog")],
  ["service-role persistence", api.includes("SUPABASE_SERVICE_ROLE_KEY") && api.includes("persistRoutes")],
  ["OSM live source retained", api.includes("fetchOverpass") && api.includes("openstreetmap")],
  ["Outdooractive optional provider", api.includes("fetchOutdooractive") && api.includes("OUTDOORACTIVE_API_KEY")],
  ["Outdooractive nearby route search", api.includes("/nearby/tour?") && api.includes("len_s") && api.includes("len_e")],
  ["Outdooractive route geometry", api.includes("parseOutdooractiveGeometry") && api.includes("tour?.geometry")],
  ["server dedupe/ranking", api.includes("dedupeAndRank") && api.includes("targetDistanceScore")],
  ["edge cache preserved", api.includes("caches.default") && api.includes("stale-while-revalidate")],
  ["client consumes normalized routes", discovery.includes("catalogPayloadToRoute") && discovery.includes("json?.routes")],
  ["target distance sent server-side", discovery.includes("targetKm") && scout.includes("normalizedRequest.targetDistanceKm")],
  ["catalog route source type", routes.includes('"catalog"') && routes.includes("catalog?:")],
  ["catalog source scoring", scout.includes('route.source === "catalog"')],
  ["24-choice scout target", scout.includes("normalizedRequest.minResults || 24") && scout.includes("Math.min(24, minResults)")],
  ["database table", migration.includes("ms_running_route_catalog")],
  ["PostGIS nearby index", migration.includes("using gist(center)") && migration.includes("st_dwithin")],
  ["public read only", migration.includes("ms_running_route_catalog_public_read") && migration.includes("No INSERT/UPDATE/DELETE policy")],
  ["provider unique key", migration.includes("unique(provider,provider_route_id,sport)")],
  ["GPX bulk importer", importer.includes("pointsFromGpx") && importer.includes("ms_running_route_catalog")],
  ["GPX dedup hash", importer.includes("createHash(\"sha1\")")],
  ["GPX legal attribution metadata", importer.includes("source_license") && importer.includes("attribution")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`${failed}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`${checks.length}/${checks.length} checks passed`);
