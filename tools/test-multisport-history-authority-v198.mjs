import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../src/lib/multisportHistoryAuthority.ts", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const sync = fs.readFileSync(new URL("../src/lib/accountOwnedSync.ts", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/data/dataRegistry.ts", import.meta.url), "utf8");
const petanquePlay = fs.readFileSync(new URL("../src/pages/petanque/PetanquePlay.tsx", import.meta.url), "utf8");
const molkkyPlay = fs.readFileSync(new URL("../src/pages/molkky/MolkkyPlay.tsx", import.meta.url), "utf8");
const firefighter = fs.readFileSync(new URL("../src/lib/dartsFirefighterStats.ts", import.meta.url), "utf8");
const territories = fs.readFileSync(new URL("../src/lib/territories/territoriesStats.ts", import.meta.url), "utf8");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(bridge.includes("migrateLegacyMultisportHistoriesToHistoryV4"), "W2 migre les historiques multisports legacy vers History V4");
assert(bridge.includes("rebuildMultisportDerivedHistoryCaches"), "W2 reconstruit les anciennes clés uniquement comme caches dérivés");
assert(bridge.includes("History.upsert(rec)"), "La migration écrit les matchs dans l'autorité History V4");
assert(bridge.includes("previousOwner && previousOwner !== nextOwner"), "Un changement de compte purge les caches de l'ancien scope sans effacer le premier legacy avant migration");
assert(app.includes("installMultisportHistoryAuthorityBridge(scopeId)") && app.includes('getStorageUser() || "local"'), "Le bridge History V4 multisports fonctionne aussi hors connexion et suit le scope courant");

for (const key of [
  "dc_darts_firefighter_history_v1",
  "dc-petanque-history-v1",
  "dc_territories_history_v1",
  "dc_molkky_history_v2",
  "dc_molkky_history_v1",
  "pingpong_history",
]) {
  const statsSourceBlock = sync.slice(sync.indexOf("const STATS_SOURCE_EXACT_KEYS"), sync.indexOf("const STATS_SOURCE_PREFIXES"));
  assert(!statsSourceBlock.includes(`\"${key}\"`), `${key} ne voyage plus dans stats_sources`);
  const rule = registry.split("\n").find((line) => line.includes(`key: \"${key}\"`)) || "";
  assert(rule.includes("portable: false"), `${key} n'est plus sauvegardé comme donnée autoritaire parallèle`);
}

assert(petanquePlay.includes("id: stableMatchId") && petanquePlay.includes("matchId: stableMatchId"), "Pétanque conserve le même matchId du moteur jusqu'à History V4");
assert(molkkyPlay.includes("id: finalId") && molkkyPlay.includes("matchId: finalId") && molkkyPlay.includes("state: next"), "Mölkky finalise le même matchId avec l'état complet");
assert(!firefighter.includes("const byId = new Map(loadDartsFirefighterStatsCache()"), "Firefighter Unified ne réinjecte plus un cache local absent de History V4");
assert(!territories.includes("for (const item of loadTerritoriesHistory()) byId.set"), "Territories Unified ne réinjecte plus un cache local absent de History V4");

console.log("\n✅ V198 MULTISPORT HISTORY AUTHORITY W2 CONTRACT OK");
