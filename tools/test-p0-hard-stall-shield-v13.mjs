import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tournament = read('src/pages/TournamentCreate.tsx');
const freeze = read('src/lib/freezeWatch.ts');
const history = read('src/lib/history.ts');
const app = read('src/App.tsx');
const css = read('src/App.css');

const checks = [
  ['TournamentCreate has no 700ms bot polling', !/setInterval\s*\(\s*tick\s*,\s*700\s*\)/.test(tournament)],
  ['TournamentCreate bot refresh is event-driven', tournament.includes('dc:bots-changed') && tournament.includes('visibilitychange')],
  ['logical active tab is published', app.includes('__mscActiveTab') && app.includes('msc:route-change')],
  ['freeze route uses logical tab', freeze.includes('__mscActiveTab')],
  ['stale page interval quarantine exists', freeze.includes('shouldQuarantineStaleInterval') && freeze.includes('timer.stale-route-quarantined')],
  ['hard stall activates runtime performance shield', freeze.includes('activateRuntimePerformanceShield("hard-stall-recovered"')],
  ['worker reports recovery to main thread', freeze.includes("self.postMessage({type:'recovered',report:recovered})")],
  ['history releases runtime pressure on shield', history.includes('msc:performance-shield') && history.includes('releaseHistoryRuntimePressure')],
  ['shield reduces non-gameplay animations', css.includes('data-msc-perf-shield="1"') && css.includes('data-msc-gameplay="1"')],
];
let failed = false;
for (const [label, ok] of checks) {
  if (ok) console.log(`✅ ${label}`);
  else { failed = true; console.error(`❌ ${label}`); }
}
if (failed) process.exit(1);
console.log('\nV13 hard-stall shield contract OK');
