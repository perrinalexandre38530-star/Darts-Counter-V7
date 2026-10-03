import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const watch = read('src/lib/freezeWatch.ts');
const main = read('src/main.tsx');
const settings = read('src/pages/Settings.tsx');

assert(watch.includes('runtimeProbe:latest?.runtimeProbe||null'), 'Worker report does not persist current runtime probe');
assert(watch.includes('recentTrace:Array.isArray(latest?.recentTrace)'), 'Worker report does not persist pre-freeze trace');
assert(watch.includes('timer.setTimeout') && watch.includes('timer.setInterval'), 'Timer callbacks are not traced');
assert(watch.includes('registrationStack'), 'Timer/callback registration stack missing');
assert(watch.includes('runtime.requestIdleCallback'), 'requestIdleCallback work is not traced');
assert(watch.includes('json.parse.large'), 'Large JSON.parse is not traced');
assert(watch.includes('json.stringify.store-like'), 'Store-like JSON.stringify is not traced');
assert(watch.includes('storage.setItem.large'), 'Large synchronous Storage write is not traced');
assert(watch.includes('base64.atob.large'), 'Large base64 decode is not traced');
assert(watch.includes('long-animation-frame'), 'Long Animation Frame observer missing');
assert(watch.includes('lastReactCommit'), 'React commit evidence missing');
assert(watch.includes('diagnoseHardFreeze'), 'Automatic freeze diagnosis missing');
assert(main.includes('startFreezeWatchIfEnabled();') && main.indexOf('startFreezeWatchIfEnabled();') < main.indexOf('startMemoryWatchdog();'), 'Freeze watchdog does not start before global runtime timers');
assert(main.includes('<React.Profiler id="AppRoot" onRender={recordReactFreezeCommit}>'), 'React root profiler missing');
assert(settings.includes('CAUSE LA PLUS PROBABLE'), 'V4 diagnosis UI missing');
assert(settings.includes('Chronologie JS juste avant le gel'), 'V4 pre-freeze timeline UI missing');

console.log('✅ Freeze Watchdog V4 evidence contract OK');
