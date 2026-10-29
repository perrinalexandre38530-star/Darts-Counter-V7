import fs from "node:fs";

const stats = fs.readFileSync(new URL("../src/lib/stats/rebuildStatsFromHistory.ts", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../src/pages/StatsHub.tsx", import.meta.url), "utf8");
const sync = fs.readFileSync(new URL("../src/lib/accountOwnedSync.ts", import.meta.url), "utf8");
const storage = fs.readFileSync(new URL("../src/lib/storage.ts", import.meta.url), "utf8");
const historyV4 = fs.readFileSync(new URL("../src/lib/historyV4.ts", import.meta.url), "utf8");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(historyV4.includes("getHistoryV4AuthorityStamp"), "History V4 expose un fingerprint d'autorité léger");
assert(stats.includes("historyFingerprint"), "stats_index mémorise le fingerprint de History V4");
assert(stats.includes("history-authority-mismatch"), "un cache Stats incohérent est invalidé");
assert(!stats.includes("RESTORE FIX : ne pas écraser un index restauré"), "History vide ne retombe plus sur un ancien stats_index");
assert(stats.includes("removeAccountLocalStorageItem(STATS_QUICK_MIRROR_KEY)"), "une mutation History invalide immédiatement le Quick Stats");
assert(!hub.includes(": [...mem, ...store];"), "StatsHub ne recrée plus une vérité depuis store.history quand History est vide");
assert(!hub.includes("if (!hasBaseData && quick && normalizedHistoryLoaded && nmEffective.length === 0)"), "Dashboard ne remplace plus History vide par Quick Stats");
assert(sync.includes("Legacy remote cache: ignored"), "stats_index distant est ignoré à la réception");
assert(!sync.includes("await syncScalarDocument(DOC.statsIndex, currentStats"), "stats_index n'est plus synchronisé au boot");
assert(!sync.includes("if (idx) await pushDocument(DOC.statsIndex"), "force sync ne pousse plus stats_index");
assert(storage.includes("Restauration annulée avant toute modification locale"), "un backup stats-only échoue avant mutation locale");
assert(storage.includes("if (historyReplace) throw e;"), "une erreur History en restore replace remonte comme échec réel");

console.log("\n✅ V166 STATS AUTHORITY LOCK CONTRACT OK");
