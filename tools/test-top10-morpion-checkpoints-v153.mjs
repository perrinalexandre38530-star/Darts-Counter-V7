import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMatchCheckpointWriter } from '../src/lib/matchCheckpointWriter.ts';

// The second checkpoint must never overtake the first, even with a slow Android IDB.
const writes = [];
let releaseFirst;
const controlled = createMatchCheckpointWriter(async record => {
  writes.push(record);
  if (record === 'live-1') await new Promise(resolve => { releaseFirst = resolve; });
});
controlled.enqueue('live-1');
controlled.enqueue('live-2');
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(writes, ['live-1']);
assert.equal(controlled.isBusy, true);
let safeExit = false;
const leaving = controlled.drain().then(ok => { safeExit = ok; });
assert.equal(safeExit, false, 'Back must wait for pending writes');
releaseFirst();
await leaving;
assert.equal(safeExit, true);
assert.deepEqual(writes, ['live-1', 'live-2']);
assert.equal(controlled.status, 'saved');

// A failed last checkpoint remains retriable, without pretending it was saved.
let attempts = 0;
const statuses = [];
const finalCallbacks = [];
const failing = createMatchCheckpointWriter(async record => {
  attempts++;
  if (attempts === 1) throw new Error('IndexedDB unavailable');
}, {
  onStatus: status => statuses.push(status),
  onSaved: record => finalCallbacks.push(record.status),
});
const final = Object.freeze({ id: 'game-1', status: 'finished' });
await failing.enqueue(final);
assert.equal(failing.status, 'error');
assert.equal(failing.hasError, true);
assert.equal(await failing.drain(), false, 'cannot safely leave on failed write');
assert.deepEqual(finalCallbacks, [], 'do not announce completion before save');
await failing.retry();
assert.equal(await failing.drain(), true);
assert.equal(attempts, 2);
assert.deepEqual(finalCallbacks, ['finished']);
assert.deepEqual(statuses, ['saving', 'error', 'saving', 'saved']);

// A transient failure on an OLD checkpoint must not hide successful NEW data.
let seq = 0;
const newer = createMatchCheckpointWriter(async () => {
  if (++seq === 1) throw new Error('old snapshot failed');
});
newer.enqueue('old');
newer.enqueue('new');
assert.equal(await newer.drain(), true);
assert.equal(newer.status, 'saved');
assert.equal(newer.hasError, false);

for (const page of ['Top10Play', 'TicTacToePlay']) {
  const source = readFileSync(`src/pages/${page}.tsx`, 'utf8');
  assert.match(source, /writerRef\.current\.drain\(\)/, `${page}: exit/restart waits for IDB`);
  assert.match(source, /writerRef\.current\.retry\(\)/, `${page}: can retry latest snapshot`);
  assert.match(source, /saveStatus === "error"/, `${page}: game blocks unsafe continuation`);
  assert.match(source, /if \(!preview && (?:throwing|inputDartsRef\.current)\.length > 0\)/, `${page}: warn about unvalidated darts`);
  assert.match(source, /createMatchCheckpointWriter/, `${page}: ordered History V4 only`);
}
console.log('OK V153: ordered writes, pending exit, failure/retry, final callback, latest-checkpoint semantics');
