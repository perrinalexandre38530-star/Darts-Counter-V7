import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clearPartialVisit, savePartialVisit, loadPartialVisit, previousVisitFingerprint} from '../src/lib/partialVisitDraft.ts';

const storage = new Map();
globalThis.window = { localStorage: {
  getItem: k => storage.has(k) ? storage.get(k) : null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: k => storage.delete(k),
}};
const id = {mode:'top_10',matchId:'top10-test',playerId:'player1',round:0,current:0,
  committedVisits:0,previousVisit:previousVisitFingerprint([])};
const darts = [{v:20,mult:3}, {v:25,mult:2}, {v:0,mult:1}];
assert.equal(loadPartialVisit(id), null, 'no drafts for new game');
assert.equal(savePartialVisit(id, darts.slice(0, 2), 3), true);
assert.deepEqual(loadPartialVisit(id),{darts:darts.slice(0,2),multiplier:3},'exact draft returned');
assert.equal(loadPartialVisit({...id, playerId:'player2'}),null,'cannot replay for another player');
assert.equal(loadPartialVisit({...id, round:1}),null,'cannot replay a new round');
assert.equal(loadPartialVisit({...id, current:1}),null,'cannot replay another turn');
assert.equal(loadPartialVisit({...id, committedVisits:1}),null,'cannot replay after validated visit');
assert.equal(loadPartialVisit({...id, mode:'tic_tac_toe'}),null,'never mix modes');
assert.equal(loadPartialVisit({...id, previousVisit:'other'}),null,'cannot replay when History progressed differently');
assert.equal(loadPartialVisit(id),null,'stale draft removed after mismatch');
assert.equal(savePartialVisit(id, [{v:25,mult:1}], 1),true);
assert.equal(savePartialVisit(id, darts, 2),true);
assert.equal(loadPartialVisit(id).darts.length,3,'three yet-to-be-validated darts may be restored');
clearPartialVisit(id);
assert.equal(loadPartialVisit(id),null,'validated visit clears draft');
assert.equal(savePartialVisit(id, [{v:25,mult:3}], 1),false,'invalid triple bull rejected');
assert.equal(savePartialVisit(id, [{v:0,mult:2}], 1),false,'invalid double miss rejected');
assert.equal(savePartialVisit(id, [{v:21,mult:1}], 1),false,'invalid target rejected');
assert.equal(savePartialVisit(id, darts.concat(darts), 1),false,'more than three darts rejected');
assert.equal(savePartialVisit(id, darts.slice(0,1),1),true);
assert.equal(savePartialVisit(id,[],1),true);
assert.equal(loadPartialVisit(id),null,'cancel removes draft');
assert.equal(previousVisitFingerprint([{v:20,mult:3}]),previousVisitFingerprint([{v:20,mult:3}]),'deterministic progress key');
assert.notEqual(previousVisitFingerprint([{v:20,mult:3}]),previousVisitFingerprint([{v:5,mult:3}]),'changed History cannot replay');
const target = {...id, mode:'tic_tac_toe',matchId:'morpion-test',round:2,committedVisits:5, previousVisit:previousVisitFingerprint([{v:3}])};
assert.equal(savePartialVisit(target,[{v:25,mult:2}],2),true);
assert.deepEqual(loadPartialVisit(target),{darts:[{v:25,mult:2}],multiplier:2},'morpion restored');
const storageKey = [...storage.keys()][0];
const saved = JSON.parse(storage.get(storageKey));
storage.set(storageKey,JSON.stringify({...saved, storedAt: Date.now()-31*86400_000}));
assert.equal(loadPartialVisit(target),null,'stale >30 day draft rejected');
assert.equal(storage.size,0,'stale draft cleaned');
// A locked-down Android WebView must not prevent any game input / break the page.
globalThis.window = {get localStorage(){throw Error('storage blocked')}};
assert.equal(savePartialVisit(id,darts,1),false);
assert.equal(loadPartialVisit(id),null);
assert.doesNotThrow(()=>clearPartialVisit(id));

for (const page of ['Top10Play','TicTacToePlay']) {
  const s = readFileSync(`src/pages/${page}.tsx`,'utf8');
  assert.match(s,/loadPartialVisit\(draftIdentity\(restored\.id/,'hydrate from authoritative History progression');
  assert.match(s,/savePartialVisit\(draftIdentity\(id\.current/,'draft saved on local input');
  assert.match(s,/!throwing\.length && \(writerRef\.current\.isBusy \|\| writerRef\.current\.hasError\)/,'draft retained until checkpoint acknowledgment (V164)');
  assert.match(s,/if \(hydration !== "ready" \|\| preview\) return;/,'read-only preview does not save drafts');
  assert.match(s,/!restored\.finished/,'no draft for a finished game');
  assert.match(s,/Volée non validée restaurée sur cet appareil/,'user told to verify resumed darts');
  assert.match(s,/Stockage local indisponible/,'warn if storage cannot retain draft');
  assert.match(s,/if \(!resuming\)\s*\{\s*persist\(/,'do not create a new History match when resuming');
}
console.log('OK V159: partial drafts, exact turn/revision guard, invalid input, 30-day TTL, Android storage exceptions, preview isolation');
