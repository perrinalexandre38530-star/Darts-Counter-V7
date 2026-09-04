import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const registry=JSON.parse(read("data/running-route-catalog/world-sources.json"));
const sync=read("tools/sync-running-route-catalog-world.mjs");
const api=read("functions/api/running/routes/catalog.ts");
const importer=read("tools/import-running-route-catalog-gpx.mjs");
const migration=read("supabase/migrations/20260904173000_running_route_catalog_global_v2.sql");
const sources=new Map((registry.sources||[]).map(s=>[s.id,s]));
const checks=[
 ["AURA registry",sources.has("aura-geotrek")&&sources.get("aura-geotrek").adapter==="geotrek-v2"],
 ["OSM worldwide retained",sources.has("openstreetmap-worldwide")&&api.includes("fetchOverpass")],
 ["England OGL source",sources.get("natural-england-national-trails")?.license?.includes("Open Government Licence")],
 ["NPS source",sources.has("nps-public-trails")],
 ["USFS source",sources.has("usfs-national-forest-trails")],
 ["NZ DOC source",sources.has("nz-doc-walking-tramping")],
 ["NC source blocked",sources.get("wa-dbca-long-trails")?.autoSync===false&&sources.get("wa-dbca-long-trails")?.commercialReuseAllowed===false],
 ["ArcGIS adapter",sync.includes("syncArcgis")&&sync.includes('f: "geojson"')],
 ["Geotrek adapter",sync.includes("syncGeotrek")&&sync.includes("downloadGpxPoints")],
 ["commercial licence gate",sync.includes("commercialReuseAllowed !== true")],
 ["multi-activity migration",migration.includes("'cycling'")&&migration.includes("'mtb'")&&migration.includes("'snowshoe'")],
 ["country metadata",migration.includes("country_code")&&api.includes("countryCode")],
 ["GPX importer expanded",importer.includes('"gravel"')&&importer.includes('"ski-touring"')],
 ["catalog API v3",api.includes('x-mss-route-catalog": "v3')],
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'✓':'✗'} ${label}`);if(!ok)failed++;}
if(failed){console.error(`${failed}/${checks.length} failed`);process.exit(1);}console.log(`${checks.length}/${checks.length} passed`);
