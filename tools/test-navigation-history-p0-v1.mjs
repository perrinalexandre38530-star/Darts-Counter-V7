import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const app = read("src/App.tsx");
const history = read("src/lib/history.ts");
const historyPage = read("src/pages/HistoryPage.tsx");
const statsIndex = read("src/lib/stats/rebuildStatsFromHistory.ts");
const runtimePerformance = read("src/lib/runtimePerformance.ts");
const completedMatchAutoBackup = read("src/lib/completedMatchAutoBackup.ts");
const matchAutoBackup = read("src/lib/matchAutoBackup.ts");
const cloudAccountBackup = read("src/lib/cloudAccountBackup.ts");
const externalBackupTarget = read("src/lib/externalBackupTarget.ts");

// Mobile navigation must never kick off the four expensive Stats prewarm scans.
assert(
  app.includes("if (isConstrained()) return;") &&
  app.indexOf("if (isConstrained()) return;") < app.indexOf("const startWarm = (force: boolean) =>"),
  "Mobile Stats auto-prewarm is not disabled before heavy warm-up work",
);

// Repeated History.list() consumers reacting to one event must share a scan.
assert(history.includes("__historyListInFlight"), "History.list single-flight guard missing");
assert(history.includes("HISTORY_LIST_COALESCE_MS = 450"), "History.list short coalescing window missing");
assert(history.includes("invalidateHistoryListReadCache()"), "History list cache invalidation missing");

// A large compressed legacy fallback must not be decompressed on every list call.
assert(history.includes("__legacyRowsCache"), "Legacy history decode cache missing");
assert(history.includes("LEGACY_FALLBACK_EMPTY_RECHECK_MS = 5000"), "Legacy empty fallback bounded recheck missing");
assert(history.includes("cached.localRaw === localRaw"), "Legacy raw-value cache validation missing");

// History cards: only hydrate near the first viewport and in small mobile batches.
assert(historyPage.includes("const maxHydratedRows = constrained ? 24 : 48"), "History card hydration window is not bounded for mobile");
assert(historyPage.includes("const batchSize = constrained ? 4 : 10"), "History card mobile hydration batch is too large");
assert(historyPage.includes("payloadDecodeBudget = isConstrainedHistoryDevice() ? 6 : 16"), "Legacy card payload decode budget is not bounded on mobile");

// A finished match may mark stats dirty anywhere, but a full rebuild is deferred
// until the user is actually in a Stats route on a constrained device.
assert(statsIndex.includes("function isStatsIndexRuntimeActive()"), "Stats runtime route guard missing");
assert(
  statsIndex.includes("if (constrained && !isStatsIndexRuntimeActive())"),
  "Automatic mobile stats rebuild is not deferred outside Stats",
);
assert(
  statsIndex.includes("if (constrained && !isStatsIndexRuntimeActive()) return;"),
  "Idle stats rebuild does not re-check that the user is still in Stats",
);


// Heavy full-account snapshots are the most dangerous delayed source of mobile
// jank. They must remain queued while the app is visible and only resume once
// Android/iOS has genuinely moved the app out of the navigation foreground.
assert(runtimePerformance.includes("export function shouldDeferHeavyRuntimeWork()"), "Shared heavy-work foreground guard missing");
assert(
  completedMatchAutoBackup.includes("if (shouldDeferHeavyRuntimeWork())") &&
  completedMatchAutoBackup.includes("Snapshot complet reporté hors navigation"),
  "Completed-match full snapshot can still run in the mobile foreground",
);
assert(
  cloudAccountBackup.includes("if (!allowForeground && shouldDeferHeavyRuntimeWork())") &&
  cloudAccountBackup.includes("installDeferredRuntimeListeners()"),
  "Automatic R2 account snapshots are not deferred in the mobile foreground",
);
assert(
  externalBackupTarget.includes("if (shouldDeferHeavyRuntimeWork())") &&
  externalBackupTarget.includes("deferredAutoReason"),
  "External file/SD auto snapshot can still run in the mobile foreground",
);
assert(
  history.includes("if (shouldDeferHeavyRuntimeWork())") &&
  history.includes("__deferredCloudPushReason"),
  "History NAS/Supabase snapshot push is not deferred in the mobile foreground",
);
assert(
  matchAutoBackup.includes("queuePersonalCloudFullSnapshot") &&
  matchAutoBackup.includes('args.source !== "history-prewrite-revision"') &&
  matchAutoBackup.includes("dc_cloud_auto_full_backup_deferred_v1"),
  "Per-match backup path can still duplicate full-account snapshots in foreground",
);

console.log("✅ NAVIGATION + LARGE HISTORY P0 V1 CONTRACT OK");
