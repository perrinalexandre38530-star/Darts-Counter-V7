import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildCanonicalX01IndexV2 } from '../src/lib/x01CanonicalIndexV2.ts';

const filename = process.argv[2];
assert.ok(filename, 'Usage: node --experimental-strip-types tools/test-x01-index-v121-b.mts <original-backup.json>');
const backup = JSON.parse(fs.readFileSync(filename, 'utf8'));
const rows = Object.values(backup.history.rows);
const originalDigest = JSON.stringify(backup.history);
const index = buildCanonicalX01IndexV2(rows, {});
assert.equal(rows.length, 107);
assert.equal(index.x01MatchCount, 67);
assert.equal(JSON.stringify(backup.history), originalDigest, 'Index generation must not mutate History');

// History V4 headers exclude payload and payloadCompressed; ensure the core
// delivers identical classification and membership without decompressing blobs.
const headerRows = rows.map((row: any) => {
  const { payload, payloadCompressed, ...header } = row;
  return header;
});
const headerIndex = buildCanonicalX01IndexV2(headerRows, {});
assert.equal(headerIndex.x01MatchCount, index.x01MatchCount);
const matrix = (matches: any[]) => Object.fromEntries(
  [...matches.reduce((map: Map<string,number>, m) => {
    const k = `${m.startScore || 'unknown'}|${m.inMode}|${m.outMode}`;
    map.set(k, (map.get(k) || 0) + 1);
    return map;
  }, new Map<string,number>())].sort()
);
assert.deepEqual(matrix(headerIndex.matches), matrix(index.matches));
assert.deepEqual(matrix(index.matches), {
  '301|simple|simple': 7,
  '301|unknown|unknown': 47,
  '501|simple|double': 12,
  '501|unknown|unknown': 1,
});
const scoreMatches = (matches: any[]) => matches.map((m) => [m.matchId, m.participants.map((p: any) => p.historicalPlayerId)]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
assert.deepEqual(scoreMatches(headerIndex.matches), scoreMatches(index.matches));
assert.equal(backup.matchCount, 107);
console.log('PASS: History original intact, 107 records, 67 X01, legacy matrix, header-only parity, no ID rewrite.');
