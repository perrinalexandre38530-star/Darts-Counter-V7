#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const dir=path.resolve("supabase/migrations");
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".sql")).sort();
const expected=["20260727_public_online_nearby.sql", "20260730_nearby_map_encounters_places.sql", "20260730_nearby_map_participation_v2.sql", "20260826_running_route_community_v1.sql", "20260826_running_route_community_v2.sql", "20260830_esports_public_network_v3.sql", "20260830231400_esports_competitive_network_v4.sql", "20260831073300_esports_ranked_sessions_v5.sql", "20260901_running_public_routes_v3.sql", "20260901191600_esports_ranked_progression_v6.sql", "20260902143000_online_community_pulse_v1.sql", "20260904_running_route_catalog_v1.sql"];
const missing=expected.filter(f=>!files.includes(f));
console.log(`Migrations found: ${files.length}`);
for(const f of expected) console.log(`${files.includes(f)?"OK":"MISSING"} ${f}`);
if(missing.length){ console.error(`Missing ${missing.length} expected migration(s).`); process.exit(1); }
console.log("Local migration set: OK");
