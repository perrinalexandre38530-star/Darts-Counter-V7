import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const must = (value, message) => {
  if (!value) throw new Error(message);
};

const core = read("src/awena/AwenaCore.ts");
const deep = read("src/awena/AwenaDeepKnowledge.ts");
const routes = read("src/awena/AwenaRouteAtlas.ts");
const help = read("src/awena/AwenaHelpRegistry.ts");
const live = read("src/awena/AwenaLiveScreen.ts");
const detailed = read("src/awena/AwenaDetailedKnowledge.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const app = read("src/App.tsx");

must(core.includes("answerAwenaDeepKnowledge"), "Deep knowledge is not wired in AwenaCore.");
must(core.includes("answerAwenaRouteAtlas"), "Route atlas is not wired in AwenaCore.");
must(core.includes("answerAwenaRegisteredHelp"), "InfoDot fuzzy knowledge is not wired in AwenaCore.");
must(deep.includes("training-time-attack") && deep.includes("territories") && deep.includes("account-local-cloud"), "Deep corpus is incomplete.");
must(help.includes("dc-awena-help-registry-v2") && help.includes("answerAwenaRegisteredHelp"), "Persistent InfoDot help registry missing.");
must(live.includes("AIDE / TEXTE VISIBLE") && live.includes("relevantVisibleText"), "Live screen explanatory text support missing.");
must(overlay.includes("LOCAL V8.1"), "Overlay version is not V8.1.");

const tabMatch = app.match(/type Tab\s*=\s*([\s\S]*?);/);
const appTabs = tabMatch ? Array.from(tabMatch[1].matchAll(/\|\s*"([^"]+)"/g)).map((m) => m[1]) : [];
const routeIds = Array.from(routes.matchAll(/\n\s*id:\s*"([^"]+)"/g)).map((m) => m[1]);
must(appTabs.length >= 150, `Expected a broad App Tab inventory, got ${appTabs.length}.`);
for (const tab of appTabs) {
  must(routeIds.includes(tab), `Route atlas missing App tab: ${tab}`);
}

const ready = read("src/games/dartsGameRegistry.ts").match(/const READY_IDS = new Set<string>\(\[([\s\S]*?)\]\);/);
const readyIds = ready ? Array.from(ready[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
const detailedIds = Array.from(detailed.matchAll(/^\s{2}([a-zA-Z0-9_]+):\s*\{/gm)).map((m) => m[1]);
for (const id of readyIds) {
  must(detailedIds.includes(id), `Detailed Awena knowledge missing READY darts mode: ${id}`);
}

console.log(`✅ AWENA V8.1 deep encyclopedia: OK`);
console.log(`   ${routeIds.length} application routes indexed`);
console.log(`   ${readyIds.length} READY darts modes with detailed knowledge`);
