import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const historyCloud = read("src/lib/historyCloud.ts");
const history = read("src/lib/history.ts");
const storage = read("src/lib/storage.ts");
const recoveredTs = read("src/lib/importRecoveredHistory.ts");
const recoveredJs = read("src/lib/importRecoveredHistory.js");

assert.match(historyCloud, /mergeHistorySnapshotRowMonotonic/);
assert.match(historyCloud, /const existingDump = await exportHistoryDump/);
assert.match(historyCloud, /preparedRows\[id\] = mergeHistorySnapshotRowMonotonic/);
assert.match(historyCloud, /enrichHistoryDumpFromLocalRevisions/);
assert.match(historyCloud, /listLocalMatchBackups/);

assert.match(storage, /const historyReplace = opts\?\.historyReplace \?\? true/);
assert.match(storage, /importAll\(dump, \{ historyReplace: mode === "replace" \}\)/);
assert.match(storage, /importHistoryDump\(dump\.history, \{ replace: historyReplace \}\)/);

assert.match(history, /getLocalMatchBackup/);
assert.match(history, /decodeMatchBackupPayload/);
assert.match(history, /\[history\.auto-repair\]/);
assert.match(history, /backupIsClearlyRicher/);

assert.match(recoveredTs, /if \(parsed\.id \|\| parsed\.matchId\) return parsed/);
assert.match(recoveredJs, /if \(parsed\.id \|\| parsed\.matchId\) return parsed/);

console.log("✅ HISTORY SNAPSHOT/NAS ANTI-DESTRUCTION CONTRACT OK");
