import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const history = read('src/lib/history.ts');
const home = read('src/pages/Home.tsx');
const statsHub = read('src/pages/StatsHub.tsx');
const historyPage = read('src/pages/HistoryPage.tsx');
const dartSets = read('src/lib/statsByDartSet.ts');
const normalized = read('src/lib/statsNormalized.ts');

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

assert(history.includes('__historyGetInFlight'), 'History.get same-id single-flight missing');
assert(history.includes('__historyGetRecent'), 'History.get short cache missing');
assert(history.includes('runHistoryDecodeLane'), 'Android decode lane missing');
assert(history.includes('history.get.idbRead'), 'History.get IDB sub-step instrumentation missing');
assert(history.includes('hasMatchIdIndex ? await getHeaderByMatchId() : await scanHeader()'), 'History.get still scans headers after a valid matchId index miss');

assert(!home.includes('return await Promise.all((Array.isArray(rows) ? rows : []).map'), 'Home still hydrates the entire history in one Promise.all');
assert(home.includes('if (isAndroid) return x01Rows;') || home.includes('const batchSize = isAndroid ? 1 : 4;'), 'Home Android must skip full hydration or hydrate serially');
assert(home.includes('() => cancelled'), 'Home history hydration is not cancellable on unmount/navigation');
assert(home.includes('refreshRunning'), 'Home stats refresh can overlap');

assert(statsHub.includes('const CHUNK = constrained ? 2 : 10;'), 'StatsHub first hydration burst too large');
assert(statsHub.includes('const chunk = constrained ? 2 : 12;'), 'StatsHub X01 hydration burst too large');
assert(historyPage.includes('const batchSize = constrained ? 2 : 8;'), 'History cards hydration burst too large');
assert(dartSets.includes('const batchSize = isConstrainedDartStatsDevice() ? 2 : 8;'), 'DartSet hydration burst too large');
assert(normalized.includes('? 2 : 6'), 'Normalized stats Android concurrency limiter missing');

console.log('✅ V6 History.get anti-freeze contract OK');
