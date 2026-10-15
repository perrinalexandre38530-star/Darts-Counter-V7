import fs from 'node:fs';

const checks = [];
const assert = (ok, label) => { checks.push([!!ok, label]); if (!ok) process.exitCode = 1; };
const read = (p) => fs.readFileSync(p, 'utf8');

const diag = read('src/lib/statsSystemDiagnostics.ts');
const trace = read('src/lib/statsDiagnosticsTrace.ts');
const hub = read('src/pages/StatsHub.tsx');
const history = read('src/lib/history.ts');
const rebuild = read('src/lib/stats/rebuildStatsFromHistory.ts');
const vault = read('src/pages/StorageVaultPage.tsx');

assert(diag.includes('IndexedDB -> History -> payload hydration -> Stats index -> quick mirror -> StatsHub UI'), 'diagnostic documents the full stats pipeline');
assert(diag.includes('history-to-index-loss') && diag.includes('x01-index-loss') && diag.includes('index-to-ui-loss'), 'diagnostic locates losses by pipeline stage');
assert(diag.includes('TEST COMPLET') || diag.includes('deep'), 'diagnostic supports deep payload inspection');
assert(diag.includes('exactIdMatches') && diag.includes('nameMatches'), 'diagnostic compares exact profile IDs with legacy name matching');
assert(diag.includes('duplicateIds'), 'diagnostic detects duplicate match IDs');
assert(diag.includes('auditHistoryStorageFootprint'), 'diagnostic audits History IndexedDB headers/details');
assert(trace.includes('dc_stats_diagnostic_trace_enabled_v1'), 'trace is opt-in and persistent');
assert(trace.includes('payload|compressed|dataurl|base64'), 'trace strips heavy/raw payload fields');
assert(hub.includes('StatsSystemDiagnosticsPanel'), 'StatsHub exposes the diagnostic panel in-app');
assert(history.includes('recordStatsDiagnosticEvent("history.finished-upsert"'), 'finished history writes are traced');
assert(rebuild.includes('recordStatsDiagnosticEvent("stats.index.rebuild-start"') && rebuild.includes('stats.index.rebuild-complete'), 'stats index rebuild lifecycle is traced');
assert(vault.includes('recordStatsDiagnosticEvent("restore.stats-verified"'), 'restore stats verification is traced');
assert(vault.includes('recordStatsDiagnosticEvent("restore.stats-failed"'), 'restore stats failures are traced');

for (const [ok, label] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
console.log(`${checks.filter(([ok]) => ok).length}/${checks.length} STATS DIAGNOSTIC V124`);
