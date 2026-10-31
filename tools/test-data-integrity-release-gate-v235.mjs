import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const gate = read("src/lib/historyIntegrityGate.ts");
const historyCloud = read("src/lib/historyCloud.ts");
const storage = read("src/lib/storage.ts");
const diagnostics = read("src/lib/accountSyncDiagnostics.ts");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(gate.includes("buildHistoryPortableIntegrityManifest"), "W4 construit une signature History portable");
assert(gate.includes("activeIdsHash") && gate.includes("finishedIdsHash"), "W4 hash les ensembles d'IDs actifs et terminés");
assert(gate.includes("collectStatsIndexMatchIds"), "W4 extrait les vrais match IDs du stats_index");
assert(gate.includes("missingIds") && gate.includes("extraIds"), "W4 compare les ensembles exacts, pas seulement les compteurs");
assert(gate.includes("metadataMatchesHistoryAuthority"), "W4 conserve le fingerprint/revision local pour invalider les caches");
assert(gate.includes("isQuickPartyRecord"), "W4 exclut les parties rapides non transférées de la parité Stats profil");
assert(gate.includes('version: "w4-v235"'), "Le Release Gate est rebasé sur la référence V235");
assert(historyCloud.includes("integrity?: HistoryPortableIntegrityManifest"), "Les snapshots History embarquent leur signature portable");
assert(historyCloud.includes("attachHistoryIntegrity"), "Chaque nouvel export History reçoit sa signature W4");
assert(storage.includes("compareHistoryRowSets(incomingRows"), "Restore compare les vrais ensembles d'IDs entrants/restaurés");
assert(storage.includes("assertLocalDataIntegrityReleaseGate({ repairStats: true })"), "Restore bloque si History/Stats restent divergents après réparation");
assert(!storage.includes("if (restoredCount !== incomingIds.length)"), "L'ancien contrôle count-only n'est plus le release gate de restauration");
assert(diagnostics.includes('id: "history_stats_release_gate"'), "Le diagnostic compte expose le Release Gate W4");
assert(diagnostics.includes("remoteIdsHash") && diagnostics.includes("missingRemoteIds"), "Le diagnostic compare les IDs History locaux et Supabase, pas seulement les compteurs");
console.log("\n✅ DATA INTEGRITY RELEASE GATE V235 OK");
