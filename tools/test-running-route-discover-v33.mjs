import fs from "node:fs";

const ui = fs.readFileSync(new URL("../src/pages/running/OutdoorRouteScoutDiscover.tsx", import.meta.url), "utf8");
const module = fs.readFileSync(new URL("../src/pages/running/RunningModule.tsx", import.meta.url), "utf8");
const media = fs.readFileSync(new URL("../src/activity/outdoorRouteMedia.ts", import.meta.url), "utf8");
const checks = [
  ["dedicated discover component", module.includes("OutdoorRouteScoutDiscover")],
  ["scout stays in discover view", module.includes('setRouteChooseMode("scout")')],
  ["multi route OSM overview map", ui.includes("ScoutOverviewMap") && ui.includes("tile.openstreetmap.org")],
  ["clickable route traces", ui.includes("onClick={() => route && onSelect(route)}")],
  ["visual route cards", ui.includes("ScoutRouteCard") && ui.includes("fetchOutdoorRouteCoverPhoto")],
  ["lightweight cover photo API", media.includes("export async function fetchOutdoorRouteCoverPhoto") && (media.includes("mss-route-cover-photo-cache-v1") || media.includes("mss-route-cover-photo-cache-v2"))],
  ["sort filters", ui.includes('recommended') && ui.includes('nearby') && ui.includes('climb')],
  ["distance filters", ui.includes('short') && ui.includes('medium') && ui.includes('long')],
  ["loop filter", ui.includes("loopOnly")],
  ["score filter", ui.includes("minScore")],
  ["map fallback in cards", ui.includes("ScoutMiniMap")],
  ["route card metrics", ui.includes("estimateOutdoorRouteDurationMs") && ui.includes("difficultyScore")],
  ["route card actions", ui.includes("VOIR LA FICHE") && ui.includes("GUIDAGE")],
  ["generic route block hidden in scout", module.includes('routeOptions.length && routeChooseMode !== "scout"')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? "✓" : "✗"} ${name}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
