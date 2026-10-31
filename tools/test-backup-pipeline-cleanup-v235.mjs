import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const history = read("src/lib/history.ts");
const completed = read("src/lib/completedMatchAutoBackup.ts");
const storage = read("src/lib/storage.ts");
const coordinator = read("src/lib/backup/accountBackupCoordinator.ts");
const orchestrator = read("src/lib/sync/syncOrchestrator.ts");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(!history.includes('import { queueCompletedMatchAutoBackup }'), "History ne branche plus le second pipeline de snapshot complet par match");
assert(!history.includes("queueCompletedMatchAutoBackup({"), "History ne déclenche plus de snapshot complet après chaque partie");
assert(history.includes('"msc:local-match-committed"'), "History publie toujours le commit local après persistance");
assert(history.includes("isDefinitelyFinishedForBackup") && history.includes("if (!isCloudImporting() && isDefinitelyFinishedForBackup(safe))"), "La sauvegarde individuelle ne part plus sur les statuts live/active/pending");
assert(orchestrator.includes('["msc:local-match-committed", 900]'), "L'orchestrateur global écoute le commit match et reste l'unique déclencheur de sync");
assert(!completed.includes("saveConfiguredBackupNow"), "Le shim completedMatchAutoBackup ne construit plus de snapshot complet");
assert(completed.includes('incrementalOnly: true') && completed.includes('"msc:sync-request"'), "Le shim legacy se contente de demander une passe incrémentale");
assert(storage.includes("countLegacyStatsOnlyMatchesFromDump"), "Restore détecte encore les vieux backups stats-only pour les refuser proprement");
assert(!storage.includes("buildSyntheticHistoryDumpFromStatsIndex"), "Restore ne fabrique plus de faux History depuis stats_index");
assert(!storage.includes("markRestoredStatsIndex"), "Restore ne promeut plus un ancien stats_index comme cache courant");
assert(coordinator.includes("if (primary.length) return primary;"), "Les anciens auto-backups locaux ne concurrencent plus les slots canoniques");
assert(coordinator.includes('latest && latest.source !== "legacy-auto"'), "Un legacy-auto ne crée plus de pointeur latest invalide");
assert(coordinator.includes("await assertLocalDataIntegrityReleaseGate({ repairStats: true });"), "La restauration est revalidée après replay des deltas");
console.log("\n✅ BACKUP PIPELINE CLEANUP V235 OK");
