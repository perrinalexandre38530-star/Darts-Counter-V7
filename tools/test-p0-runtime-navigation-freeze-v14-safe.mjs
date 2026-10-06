import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const assert = (v,m) => { if(!v) throw new Error(m); };

const home = read('src/pages/Home.tsx');
const bridge = read('src/lib/statsBridge.ts');
const hub = read('src/pages/StatsHub.tsx');
const profiles = read('src/pages/Profiles.tsx');
const watch = read('src/lib/freezeWatch.ts');
const tournament = read('src/pages/TournamentCreate.tsx');

// Stats wiring must remain present. Anti-freeze patches are forbidden from
// replacing detailed stats with permanent zero/empty fast paths.
assert(home.includes('getBasicProfileStatsAsync(profileId)'), 'Home async stats wiring missing');
assert(home.includes('dc-stats-index-updated'), 'Home stats refresh event missing');
assert(bridge.includes('export async function buildStatsIndex'), 'StatsBridge canonical index missing');
assert(bridge.includes('await api.get(id)'), 'StatsBridge detailed History hydration missing');
assert(bridge.includes('getX01ProfileStats(profileId'), 'X01 profile stats wiring missing');
assert(hub.includes('buildDashboardFromNormalized'), 'StatsHub canonical dashboard wiring missing');
assert(profiles.includes('getStatsHubAlignedProfileMiniStats'), 'Profiles → StatsHub aligned wiring missing');
assert(profiles.includes('getBasicProfileStatsAsync'), 'Profiles async stats fallback missing');

// Watchdog is diagnostic-only for generic timers/idle callbacks.
assert(watch.includes('SAFE V14 / ZIP34'), 'Safe timer policy marker missing');
assert(!watch.includes('if (isConstrainedFreezeRuntime()) return true;'), 'Generic mobile timer quarantine still active');
assert(!watch.includes('idle.stale-route-quarantined'), 'Idle callbacks are still being cancelled after navigation');
assert(watch.includes('idle.route-changed'), 'Passive idle route evidence missing');

// Confirmed BOT poller must stay removed.
assert(!tournament.includes('setInterval(tick, 700)'), 'TournamentCreate 700ms BOT poller returned');

console.log('✅ V14 SAFE: navigation/freeze diagnostics active, stats wiring preserved');
