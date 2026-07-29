import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const historyCloud = read("src/lib/historyCloud.ts");
const history = read("src/lib/history.ts");
const storage = read("src/lib/storage.ts");
const recoveredTs = read("src/lib/importRecoveredHistory.ts");
const recoveredJs = read("src/lib/importRecoveredHistory.js");
const matchAutoBackup = read("src/lib/matchAutoBackup.ts");
const cricketDetail = read("src/pages/CricketMatchDetail.tsx");
const historyPage = read("src/pages/HistoryPage.tsx");
const statsHub = read("src/pages/StatsHub.tsx");

assert.match(historyCloud, /mergeHistorySnapshotRowMonotonic/);
assert.match(historyCloud, /const existingDump = await exportHistoryDump/);
assert.match(historyCloud, /preparedRows\[id\] = mergeHistorySnapshotRowMonotonic/);
assert.match(historyCloud, /enrichHistoryDumpFromLocalRevisions/);
assert.match(historyCloud, /listLocalMatchBackups/);

assert.match(storage, /const historyReplace = opts\?\.historyReplace \?\? true/);
assert.match(storage, /importAll\(dump, \{ historyReplace: mode === "replace" \}\)/);
assert.match(storage, /importHistoryDump\(dump\.history, \{ replace: historyReplace \}\)/);

// A history READ must never trigger revision-vault scans or write-side repair.
// StatsHub hydrates many matches; old auto-repair here created a read->write->reload loop.
assert.doesNotMatch(history, /getLocalMatchBackup/);
assert.doesNotMatch(history, /decodeMatchBackupPayload/);
assert.doesNotMatch(history, /\[history\.auto-repair\]/);
assert.match(history, /History\.get\(\) is intentionally READ-ONLY/);

// Revision lookup itself must use the by_matchId index, not getAll() on the whole vault.
assert.match(matchAutoBackup, /index\("by_matchId"\)\.getAll\(wanted\)/);
assert.match(matchAutoBackup, /scheduleLocalBackupTrim/);

// Cricket rendering: preserve score line in light headers and never fabricate player S\/D\/T
// from a match-wide duplicated hitSummary.
assert.match(history, /CRICKET HEADER SCORE FIX/);
assert.match(historyPage, /baseMode\(e\)\.includes\("cricket"\)/);
assert.match(cricketDetail, /ringsAvailable/);
assert.match(cricketDetail, /globalRingSummary/);
assert.match(cricketDetail, /SCORING RATE/);
assert.match(statsHub, /playerScopedHitSummary/);

assert.match(recoveredTs, /if \(parsed\.id \|\| parsed\.matchId\) return parsed/);
assert.match(recoveredJs, /if \(parsed\.id \|\| parsed\.matchId\) return parsed/);

console.log("✅ HISTORY SNAPSHOT/NAS ANTI-DESTRUCTION CONTRACT OK");
