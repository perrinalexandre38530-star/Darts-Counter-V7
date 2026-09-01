import fs from "node:fs";
const src = fs.readFileSync("src/pages/running/RunningModule.tsx","utf8");
const css = fs.readFileSync("src/pages/running/runningResponsive.css","utf8");
const checks = [
 ["live panel state", src.includes('type LiveMetricPanel') && src.includes('liveMetricPanel')],
 ["map first in cockpit", src.indexOf('livePage === "cockpit"') < src.indexOf('<RouteMap points={points}')],
 ["one-row icon selector", src.includes('running-live-selector') && src.includes('ESSENTIEL') && src.includes('RYTHME') && src.includes('RELIEF') && src.includes('CAPTEURS')],
 ["live essential stats", src.includes('liveMetricPanel === "essential"') && src.includes('formatDistance(liveDistance)')],
 ["live pace stats", src.includes('liveMetricPanel === "pace"') && src.includes('VITESSE LIVE')],
 ["live relief stats", src.includes('liveMetricPanel === "relief"') && src.includes('liveGradePct') && src.includes('liveTerrain?.lossM')],
 ["live sensor stats", src.includes('liveMetricPanel === "sensors"') && src.includes('PRÉCISION GPS') && src.includes('liveMovingPct')],
 ["live split stats", src.includes('liveMetricPanel === "splits"') && src.includes('latestSplit')],
 ["live navigation stats", src.includes('liveMetricPanel === "nav"') && src.includes('progressPct') && src.includes('setLiveRouteMapFullscreen(true)')],
 ["responsive live cards", css.includes('.running-live-stats-grid') && css.includes('.running-live-selector')],
];
let failed=0; for(const [name,ok] of checks){ if(ok) console.log(`OK   ${name}`); else {console.error(`FAIL ${name}`); failed++;}}
if(failed) process.exit(1); console.log(`\n${checks.length}/${checks.length} RUNNING LIVE MAP-FIRST V62 checks passed`);
