import fs from 'node:fs';
import path from 'node:path';
import { decodeCompactMatch } from '../src/lib/matchCompactCodec.ts';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const mk = (n) => ({
  __compact: 'match.v1', v: 1, id: `legacy-${Math.random()}`,
  sp: 'darts', m: 'x01', t: 1, st: 'f', p: ['legacy-player'],
  ps: [{ i: 0, n }],
});

const doubled = decodeCompactMatch(mk({ dt: 27, avg3: 43.44444444444444, _sumpoints: 391, pts: 782, sc: 0 }));
const winnerFlag = decodeCompactMatch(mk({ dt: 23, avg3: 39.26086956521739, totalscore: 301, sc: 1 }));
const corruptedTotals = decodeCompactMatch(mk({ dt: 22, avg3: 41.04545454545455, _sumpoints: 301, pts: 409, totalscore: 409, sc: 1 }));

check('legacy compact prefers coherent _sumpoints over duplicated pts', Number(doubled?.players?.[0]?.pointsScored) === 391);
check('legacy X01 win flag sc=1 is never treated as one scored point', Number(winnerFlag?.players?.[0]?.pointsScored) === 301);
check('legacy compact rejects incoherent duplicated totals', Number(corruptedTotals?.players?.[0]?.pointsScored) === 301);
check('legacy compact keeps exact darts for weighted AVG3', Number(doubled?.players?.[0]?.dartsThrown) === 27);

const stats = read('src/lib/stats/rebuildStatsFromHistory.ts');
const agg = read('src/lib/x01MultiAgg.ts');
const storage = read('src/lib/storage.ts');
const history = read('src/lib/historyCloud.ts');

check('Stats rebuild no longer uses X01 score as scored points', !stats.includes('pl?.stats?.points ?? pl?.score ?? 0'));
check('X01 aggregate explicitly rejects binary legacy score flags', agg.includes('legacyScore > 1'));
check('X01 aggregate does not cap lifetime points to start score', !agg.includes('out.scoreTotal += Math.min(Math.max(sourcePoints'));
check('lifetime AVG3 is weighted by points and darts first', agg.includes('(lifetimePoints / lifetimeDarts) * 3'));
check('current last-10 AVG3 is weighted by points and darts when available', agg.includes('(currentPoints / currentDarts) * 3'));
check('restore accepts authoritative empty History and verifies it', storage.includes('if (incomingRowsObject)') && !storage.includes('if (incomingIds.length > 0)'));
check('profile identity finalization happens before final Stats rebuild',
  storage.indexOf('await normalizeLocalProfilesInStore();') < storage.indexOf('reason: "restore-profile-identity-finalized"'));
check('final History/Stats release gate runs after identity finalization',
  storage.indexOf('reason: "restore-profile-identity-finalized"') < storage.indexOf('Contrôle final History / Stats / appareil'));
check('legacy account aliases are restored into canonical identity', storage.includes('accountIdentityAliases'));
check('canonical History V4 remains authoritative even when empty',
  history.includes('History V4 est l\'autorité même quand il est vide') && !history.includes('if (Object.keys(activeRows).length > 0 || deleted.size > 0)'));

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
