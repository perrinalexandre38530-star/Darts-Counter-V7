// Run: node --experimental-strip-types tools/test-x01-legacy-compat-v242.mjs /path/to/backup.json
// Read-only regression test: never writes the historical backup.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildCanonicalX01IndexV2 } from '../src/lib/x01CanonicalIndexV2.ts';
import { selectCanonicalX01ProfileV3 } from '../src/lib/x01CanonicalSelectorsV3.ts';
const source = process.argv[2];
if (!source) { console.error('Usage: node --experimental-strip-types tools/test-x01-legacy-compat-v242.mjs backup.json'); process.exit(2); }
const file = JSON.parse(fs.readFileSync(source, 'utf8'));
const rows = Object.values(file?.history?.rows || {});
const NINJA = '1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f';
const aliases = {
  'b3517e84-41a1-4eb1-8f20-3e40e3875d38': NINJA,
  'bbedd4b7-e181-4b8e-a794-c948a18e8404': NINJA,
};
const sourceMatchIds = new Set(rows.map(r => String(r?.id || '')));
const index = buildCanonicalX01IndexV2(rows, {aliasMap: aliases});
const ninja = selectCanonicalX01ProfileV3(index, NINJA);
assert.equal(rows.length, 122, 'Historical backup has changed');
assert.equal(index.x01MatchCount, 68, 'X01 matches must not disappear');
assert.equal(ninja.totalMatches, 66, 'All Ninja X01 sessions must resolve without duplication');
assert.equal(ninja.reference501DO, 12, 'Confirmed Ninja 501 DO sessions');
assert.equal(ninja.exitModes.simple.matches, 22);
assert.equal(ninja.exitModes.double.matches, 12);
assert.equal(ninja.exitModes.unknown.matches, 32);
assert.equal(new Set(index.matches.map(r => r.matchId)).size, 68, 'No duplicate matches');
assert.ok(index.matches.every(r => sourceMatchIds.has(r.matchId)), 'History matches unchanged');
assert.ok(ninja.referenceLifetime.value > 30 && ninja.referenceLifetime.value < 45, 'AVG3D must not be inflated by total-score fields');
assert.ok(ninja.referenceCurrent.value > 30 && ninja.referenceCurrent.value < 45);
console.log(JSON.stringify({result:'PASS',history:rows.length,x01:index.x01MatchCount,ninja:ninja.totalMatches,confirmed501DO:ninja.reference501DO,avg3d501DOGlobal:ninja.referenceLifetime.value,avg3d501DOCurrent:ninja.referenceCurrent.value,exitModes:Object.fromEntries(Object.entries(ninja.exitModes).map(([key,value])=>[key,value.matches]))},null,2));
