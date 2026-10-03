import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const watch = read("src/lib/freezeWatch.ts");
const history = read("src/lib/history.ts");
const storage = read("src/lib/storage.ts");
const diagnostic = read("src/lib/diagnosticPro.ts");
const settings = read("src/pages/Settings.tsx");
const stats = read("src/lib/stats/rebuildStatsFromHistory.ts");

assert(watch.includes('dc_freeze_watch_enabled_v1'), "Persistent freeze-watch flag missing");
assert(watch.includes('dc_freeze_watch_heartbeat_v1'), "Persistent heartbeat missing");
assert(watch.includes('dc_freeze_watch_active_ops_v1'), "Persistent active-operation marker missing");
assert(watch.includes('previous-session-ended-with-active-operation'), "Interrupted-session recovery missing");
assert(watch.includes('kind: "main-thread-stall"'), "Main-thread stall detector missing");
assert(watch.includes('document.visibilityState'), "Background timer throttling guard missing");
assert(watch.includes('persistActiveOps();') && watch.includes('beginFreezeOperation'), "Operation is not persisted before heavy work");

// V2/V3 hard-freeze layer: a separate Worker must survive a blocked React/UI thread
// long enough to persist a report to IndexedDB.
assert(watch.includes('new Worker(url)'), "Dedicated hard-freeze Web Worker missing");
assert(watch.includes('dc-freeze-watchdog-v1'), "Worker IndexedDB report database missing");
assert(watch.includes("gap>=4000"), "Worker hard-freeze threshold missing");
assert(watch.includes('export async function getHardFreezeReport'), "Hard-freeze report reader missing");
assert(watch.includes('postHardFreezeState("state")'), "Active operations are not forwarded to worker");

assert(history.includes('beginFreezeOperation("history.list"'), "History.list is not traced");
assert(history.includes('beginFreezeOperation("history.get"'), "History.get is not traced");
assert(history.includes('beginFreezeOperation("history.payload.decode"'), "History payload decode is not traced");
assert(history.includes('beginFreezeOperation("history.legacyFallback.decode"'), "Legacy history decompression is not traced");
assert(history.includes('export async function auditHistoryStorageFootprint'), "History footprint audit missing");
assert(history.includes('SANS décompresser') || history.includes('SANS décompresser les'), "History audit must remain non-decoding/safe");
assert(history.includes('suspicious: approxBytes >= 1_500_000'), "Oversized match threshold missing");
assert(history.includes('export async function auditHistoryDecodePerformance'), "Deep per-match decode audit missing");
assert(history.includes('beginFreezeOperation("history.deepAudit.record"'), "Deep audit does not persist exact match ID before reading it");

assert(storage.includes('beginFreezeOperation("storage.loadStore"'), "loadStore is not traced");
assert(storage.includes('beginFreezeOperation("storage.saveStore"'), "saveStore is not traced");
assert(storage.includes('beginFreezeOperation("storage.mediaCapture"'), "Store media capture is not traced");
assert(storage.includes('beginFreezeOperation("storage.exportCloudSnapshot"'), "Full account snapshot export is not traced");
assert(storage.includes('beginFreezeOperation("storage.importCloudSnapshot"'), "Full account snapshot import is not traced");
assert(stats.includes('beginFreezeOperation("stats.rebuildFromHistory"'), "Stats full rebuild is not traced");
assert(diagnostic.includes('startFreezeWatchIfEnabled();'), "Freeze watchdog does not resume automatically after restart");
assert(!diagnostic.includes('if (isFreezeWatchEnabled()) return true;'), "Freeze watch incorrectly enables heavyweight deep probes");
assert(diagnostic.includes('getHardFreezeReport'), "Exported diagnostic does not include worker hard-freeze report");

assert(settings.includes('TEST INTERNE — FREEZE WATCHDOG'), "Freeze watchdog UI missing");
assert(settings.includes('Activer la surveillance Freeze'), "Freeze watchdog enable control missing");
assert(settings.includes('Auditer les parties sauvegardées'), "History footprint audit control missing");
assert(settings.includes('TEST PROFOND DES PARTIES'), "Deep history test control missing");
assert(settings.includes('WATCHDOG WORKER'), "Hard-freeze Worker result UI missing");
assert(settings.includes('Opération(s) restée(s) active(s) avant arrêt'), "Interrupted-operation UI missing");

console.log("✅ FREEZE WATCHDOG V3 CONTRACT OK");
