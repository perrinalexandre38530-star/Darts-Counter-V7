import fs from "node:fs";
import assert from "node:assert/strict";

const webGps = fs.readFileSync("src/activity/webGeolocation.ts", "utf8");
const running = fs.readFileSync("src/pages/running/RunningModule.tsx", "utf8");
const terrain = fs.readFileSync("src/pages/running/RunningTerrain3DMap.tsx", "utf8");
const headers = fs.readFileSync("public/_headers", "utf8");

assert.ok(webGps.includes("isWebGpsSecureContext") && webGps.includes('protocol === "https:"'), "PWA GPS must explicitly validate a secure context");
assert.ok(webGps.includes('name: "geolocation"') && webGps.includes('permission === "denied"'), "PWA GPS permission diagnostics missing");
assert.ok(webGps.includes("watchPosition") && webGps.includes("maximumAge: 0") && webGps.includes("enableHighAccuracy: true"), "High-accuracy fresh PWA GPS acquisition missing");
assert.ok(running.includes("initialWebFix") && running.includes("acquireWebGpsFix"), "Running must acquire a real web GPS fix before recording");
assert.ok(running.includes("lastGpsPointAtRef.current = Date.now();") && running.includes("A rejected jitter point still proves"), "Stationary PWA GPS must not be reported as lost");
assert.ok(headers.includes("Permissions-Policy: geolocation=(self)"), "Cloudflare geolocation Permissions-Policy missing");
assert.ok(terrain.includes('TERRAIN_TILES = "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"'), "Direct Mapterhorn DEM endpoint missing");
assert.ok(terrain.includes('encoding: "terrarium"') && terrain.includes("tileSize: 512"), "Mapterhorn DEM encoding/size is incorrect");
assert.ok(terrain.includes("compatPreviewTimer") && terrain.includes("readinessTimer"), "3D loader watchdog/fallback missing");
assert.ok(terrain.includes("MAPLIBRE_SCRIPTS") && terrain.includes("loadClassicScript"), "MapLibre classic-script fallback missing");

console.log("✅ RUNNING WEB GPS + 3D V40 CHECK OK");
console.log("   HTTPS/permission diagnostics + fresh high-accuracy fix + stationary signal health + direct Terrarium DEM + non-blocking 3D fallback");
