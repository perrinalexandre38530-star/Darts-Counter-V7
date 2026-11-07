// node --experimental-strip-types tools/test-x01-v246-history.mjs <history-backup.json>
// Regression test of historical data coverage, never mutates the JSON.
import fs from 'node:fs';
import { normalizeX01HistoryRecord } from '../src/lib/normalizeX01HistoryRecord.ts';
import { buildCanonicalX01IndexFromNormalizedMatchesV2 } from '../src/lib/x01CanonicalIndexV2.ts';
import { selectCanonicalX01ProfileV3 } from '../src/lib/x01CanonicalSelectorsV3.ts';
const filename=process.argv[2];
if (!filename) throw new Error('Usage: node --experimental-strip-types tools/test-x01-v246-history.mjs history.json');
const json=JSON.parse(fs.readFileSync(filename,'utf8'));
const rows=Object.values(json?.history?.rows||{});
const canonical='1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f';
const aliasMap={
 'b3517e84-41a1-4eb1-8f20-3e40e3875d38':canonical,
 'bbedd4b7-e181-4b8e-a794-c948a18e8404':canonical,
};
const matches=rows.map(v=>normalizeX01HistoryRecord(v,{aliasMap})).filter(Boolean);
const index=buildCanonicalX01IndexFromNormalizedMatchesV2(matches,rows.length);
const stats=selectCanonicalX01ProfileV3(index,canonical);
const output={backupMatches:rows.length,x01Matches:matches.length,ninjaMatches:stats.totalMatches,ninja501DO:stats.reference501DO,byExit:Object.fromEntries(Object.entries(stats.exitModes).map(([key,val])=>[key,val.matches])),avg3D501DO:stats.referenceLifetime.value,currentAvg3D501DO:stats.referenceCurrent.value};
console.log(JSON.stringify(output,null,2));
if(json.matchCount!==rows.length)throw new Error('Backup metadata does not match rows');
if(json.format==='multisports-scoring-history-backup'&&rows.length===122&&(
 matches.length!==68||stats.totalMatches!==66||stats.reference501DO!==12||
 stats.exitModes.simple.matches!==22||stats.exitModes.double.matches!==12||stats.exitModes.unknown.matches!==32
))throw new Error('Regression in 2026-11-07 reference backup coverage');
console.log('PASS — source history unchanged');
