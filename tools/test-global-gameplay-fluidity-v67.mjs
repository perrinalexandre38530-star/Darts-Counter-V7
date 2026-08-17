import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const history = read("src/lib/history.ts");
const telemetry = read("src/lib/dartsTelemetry.ts");
const app = read("src/App.tsx");

// IndexedDB: one reusable connection, not indexedDB.open() on every visit.
assert(history.includes("__historyDbCache"), "History DB connection cache missing");
assert(history.includes("if (__historyDbCache.name === dbName && __historyDbCache.db)"), "History DB cache is not reused");
assert(history.includes("const req = indexedDB.open(dbName, DB_VER)"), "History DB still opens through the old unscoped path");

// Every mode uses the lightweight in-progress pipeline, not only X01.
assert(history.includes("const isLive = _isInProgressRecord(rec);"), "Global in-progress History fast path missing");
assert(history.includes("resume.livePayload = incomingLivePayload"), "Generic live payload recovery missing");
assert(history.includes("isLiveHeader && resume?.livePayload"), "Generic live payload is not merged on resume");

// The gameplay checkpoint must not run recursive sanitization/compression/telemetry.
const checkpointStart = history.indexOf("export async function upsertInProgressCheckpoint");
const checkpointEnd = history.indexOf("export async function upsert(rec", checkpointStart);
const checkpoint = history.slice(checkpointStart, checkpointEnd);
assert(checkpointStart >= 0 && checkpointEnd > checkpointStart, "Checkpoint function not found");
assert(!checkpoint.includes("sanitizeRecord(rec)"), "Recursive sanitizeRecord still runs on gameplay checkpoint");
assert(!checkpoint.includes("compressToUTF16"), "Payload compression still runs on gameplay checkpoint");
assert(!checkpoint.includes("scheduleStatsIndexRefresh"), "Stats rebuild still runs on gameplay checkpoint");
assert(!checkpoint.includes("EventBuffer.syncNow"), "Network sync still runs on gameplay checkpoint");

// Telemetry is derived only when the match is finished; raw visits remain the source of truth.
assert(telemetry.includes('status === "in_progress"'), "Telemetry live skip missing");
assert(telemetry.includes("return null;"), "Telemetry live skip does not return early");

// Background stats/preloads must recognize legacy gameplay route names too.
assert(app.includes('routeName === "x01"'), "Legacy X01 gameplay route not protected");
assert(app.includes('routeName === "cricket"'), "Cricket gameplay route not protected");
assert(app.includes('routeName === "training_clock"'), "Training gameplay route not protected");
assert(app.includes("isConstrained() ? ric(run) : ric(run, { timeout: 2500 })"), "Mobile stats warm-up can still be forced by timeout");
assert(app.includes("isConstrained() ? 3600 : 1100"), "Navigation quiet-period guard missing");

console.log("✅ GLOBAL GAMEPLAY FLUIDITY V67 CONTRACT OK");
