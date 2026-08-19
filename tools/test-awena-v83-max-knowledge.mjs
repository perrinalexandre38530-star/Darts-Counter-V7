import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
};

const registry = read("src/games/dartsGameRegistry.ts");
const rawBlock = registry.split("const rawDartsGameRegistry")[1]?.split("export const dartsGameRegistry")[0] || "";
const dartsIds = [...rawBlock.matchAll(/\n\s*id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
const uniqueDartsIds = [...new Set(dartsIds)];

const detailed = read("src/awena/AwenaDetailedKnowledge.ts");
const missingDeep = uniqueDartsIds.filter((id) => !new RegExp(`\\n\\s{2}${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}:\\s*\\{`).test(detailed));
assert(uniqueDartsIds.length >= 63, `registre Fléchettes V74 détecté (${uniqueDartsIds.length} modes)`);
assert(missingDeep.length === 0, `tous les modes Fléchettes ont une fiche DEEP (${uniqueDartsIds.length}/${uniqueDartsIds.length})`);

const app = read("src/App.tsx");
const appRoutes = [...new Set([...app.matchAll(/case\s+["']([^"']+)["']\s*:/g)].map((m) => m[1]))];
const routeAtlas = read("src/awena/AwenaRouteAtlas.ts");
const atlasIds = new Set([...routeAtlas.matchAll(/\n\s*id:\s*["']([^"']+)["']/g)].map((m) => m[1]));
const missingRoutes = appRoutes.filter((id) => !atlasIds.has(id));
assert(appRoutes.length >= 186, `routes App.tsx détectées (${appRoutes.length})`);
assert(missingRoutes.length === 0, `RouteAtlas couvre toutes les routes App.tsx (${appRoutes.length}/${appRoutes.length})`);

const master = read("src/awena/AwenaMasterEncyclopedia.ts");
assert(master.includes("PÉTANQUE") && master.includes("PING-PONG") && master.includes("MÖLKKY"), "Master Encyclopedia couvre Pétanque, Ping-Pong et Mölkky");
assert(master.includes("FARKLE") && master.includes("POKER DICE") && master.includes("BABY-FOOT"), "Master Encyclopedia couvre Dés et Baby-foot en détail");
assert(master.includes("FORMATS FOOT") && master.includes("11V11"), "Master Encyclopedia couvre FOOT et ses formats");
assert(master.includes("mode_not_ready"), "statut des concepts Fléchettes non finalisés pris en compte");

const source = read("src/awena/AwenaSourceAtlas.ts");
const sourceEntries = (source.match(/\n\s*route:\s*"/g) || []).length;
const sourceFacts = (source.match(/\n\s{6}"/g) || []).length;
assert(sourceEntries >= 140, `atlas de source riche (${sourceEntries} fiches composants)`);
assert(sourceFacts >= 3000, `atlas de source riche (${sourceFacts} libellés / aides UI)`);

const config = read("src/awena/AwenaConfigKnowledge.ts");
assert(config.includes("fallbackDetailFromRegistry"), "fallback de configuration automatique depuis le registre Darts");

const core = read("src/awena/AwenaCore.ts");
assert(core.includes("answerAwenaMasterEncyclopedia") && core.includes("answerAwenaSourceAtlas"), "AwenaCore branche les nouvelles couches de connaissance");

const overlay = read("src/awena/components/AwenaOverlay.tsx");
assert(overlay.includes("LOCAL V8.5") || overlay.includes("LOCAL V8.4") || overlay.includes("LOCAL V8.3"), "badge Awena LOCAL V8.3+");

console.log("\nAWENA V8.3 — MAX KNOWLEDGE: OK");
