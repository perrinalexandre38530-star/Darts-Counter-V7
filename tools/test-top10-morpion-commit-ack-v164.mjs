// V164 — une volée validée reste un brouillon récupérable tant que History V4
// n'a pas accusé réception. Test local sans IndexedDB ni React.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMatchCheckpointWriter } from '../src/lib/matchCheckpointWriter.ts';
import { savePartialVisit, loadPartialVisit, clearPartialVisit, previousVisitFingerprint } from '../src/lib/partialVisitDraft.ts';

const map = new Map();
const localStorage = {
  getItem: (k) => map.get(k) ?? null,
  setItem: (k, v) => map.set(k, v),
  removeItem: (k) => map.delete(k),
};
globalThis.window = { localStorage };
const darts = [{v:20,mult:3},{v:25,mult:2},{v:0,mult:1}];
const mk = (mode) => ({ mode, matchId:'match-v164-'+mode, playerId:'profile-a', round:0, current:0,
  committedVisits:0, previousVisit:previousVisitFingerprint([]) });

for (const mode of ['top_10','tic_tac_toe']) {
  const identity = mk(mode);
  let resolveUpsert;
  const writer = createMatchCheckpointWriter(async () => new Promise((resolve) => { resolveUpsert = resolve; }));
  assert.ok(savePartialVisit(identity,darts,2),'the three darts are stored BEFORE history write');
  writer.enqueue({ id: identity.matchId, status:'in_progress' });
  await new Promise((resolve)=>setImmediate(resolve));
  assert.equal(writer.isBusy,true);
  assert.deepEqual(loadPartialVisit(identity)?.darts,darts,'Android crash mid-upsert can restore the three darts');
  assert.deepEqual(loadPartialVisit({...identity, playerId:'other'}),null,'stale/other player cannot reuse pending draft');
  // Re-simulate draft of this turn after the mismatch test intentionally removed the stale entry.
  savePartialVisit(identity,darts,2);
  resolveUpsert();
  assert.equal(await writer.drain(),true,'checkpoint confirmed');
  clearPartialVisit(identity); // Equivalent to UI effect once saveStatus becomes "saved".
  assert.equal(loadPartialVisit(identity),null,'draft can be cleared only AFTER successful write');
  assert.equal(writer.status,'saved');

  let attempts = 0;
  const failing = createMatchCheckpointWriter(async () => {
    if (++attempts === 1) throw new Error('Android IndexedDB quota/transient failure');
  });
  assert.equal(savePartialVisit(identity,darts,1),true);
  await failing.enqueue({ id:identity.matchId });
  assert.equal(failing.hasError,true);
  assert.deepEqual(loadPartialVisit(identity)?.darts,darts,'failed write keeps all three darts');
  assert.equal(await failing.drain(),false,'cannot leave as if saved');
  await failing.retry();
  assert.equal(await failing.drain(),true,'retry can succeed');
  clearPartialVisit(identity);
  assert.equal(loadPartialVisit(identity),null,'confirmed retry releases draft');

  // A late old draft cannot be replayed after History has advanced.
  assert.equal(savePartialVisit(identity,darts,3),true);
  assert.equal(loadPartialVisit({...identity, committedVisits:1,previousVisit:'new'}),null);
  assert.equal(loadPartialVisit(identity),null);
}

for (const page of ['Top10Play', 'TicTacToePlay']) {
  const s = readFileSync(`src/pages/${page}.tsx`,'utf8');
  assert.match(s, /if \(!\w+\.isBot\) savePartialVisit\(draftIdentity\(id\.current/, page+' saves all 3 darts synchronously on validate');
  assert.match(s, /!throwing\.length && \(writerRef\.current\.isBusy \|\| writerRef\.current\.hasError\)/,page+' keeps pending draft');
  assert.match(s, /throwing, mult, saveStatus\]/,page+' clears draft after acknowledgment arrives');
  assert.match(s, /commitGuard\.current \|\| leavingRef\.current \|\| \(writerRef\.current\.isBusy \|\| writerRef\.current\.hasError\)/,page+' blocks multiple commits until saved');
  assert.match(s, /\(writerRef\.current\.isBusy \|\| writerRef\.current\.hasError\).*botSummary/,page+' bots pause until checkpoint ack');
  assert.doesNotMatch(s, /saveStatus !== "saved".*botSummary/,page+' resumed bots work when writer is idle');
  assert.match(s, /botSummary && saveStatus !== "error"/,page+' failed bot checkpoint exposes retry button');
  assert.match(s, /onSaved: \(rec: any\) => \{ if \(rec.status === "finished"\) \{ clearPartialVisit/,page+' final persisted record clears local draft before finish callback');
  assert.match(s, /disabled=\{saveStatus === "saving"\}/,page+' bot Continue is locked while saving');
}
console.log('OK V164: pending/failing/successful writes, Android crash recovery, retry, bot resume, double-entry barriers');
