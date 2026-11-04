/** V141 — Regression draft/reprise locale pour les deux familles de jeux Darts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readDartsMatchDraft, writeDartsMatchDraft, clearDartsMatchDraft } from '../src/lib/dartsMatchDrafts.ts';
import { createHalveItState, playHalveItVisit } from '../src/lib/gameEngines/halveItEngine.ts';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k,v) => store.set(k,String(v)),
  removeItem: k => store.delete(k),
};
const code = p => readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const miss = {bed:'MISS'};
const players = [{id:'a',name:'A'},{id:'b',name:'B'}];
const rules = {participantMode:'players',sequencePreset:'extended9',customTargets:['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'],startMode:'fixed',fixedStartingScore:40,rounding:'floor'};
let split = createHalveItState(players,rules);
split = playHalveItVisit(split,[{bed:'T',number:15},miss,miss]);
split = playHalveItVisit(split,[miss,miss,miss]);
assert.equal(split.scoresByPlayer.a,85);
assert.equal(split.scoresByPlayer.b,20);
assert.equal(split.roundIndex,1);
const cfg = {mode:'halve_it',variantId:'split_score',sessionId:'split123',players:2,selectedIds:['a','b']};
assert.equal(writeDartsMatchDraft('split_score',cfg,{state:split,throwDarts:[{v:16,mult:1}],multiplier:2,matchId:'split123'}),true);
assert.equal(readDartsMatchDraft('halve_it'),null,'each mode has a distinct slot');
const restored = readDartsMatchDraft('split_score');
assert.equal(restored.config.sessionId,'split123');
assert.deepEqual(restored.snapshot.state.targets.map(x=>x.id),rules.customTargets);
assert.equal(restored.snapshot.state.scoresByPlayer.a,85);
assert.equal(restored.snapshot.state.statsByPlayer.b.halvingEvents,1);
assert.deepEqual(restored.snapshot.throwDarts,[{v:16,mult:1}]);
let next = playHalveItVisit(restored.snapshot.state,[{bed:'S',number:16},miss,miss]);
assert.equal(next.scoresByPlayer.a,101,'score resumes with no reset');
assert.equal(next.history.length,3);

// Chase and the parent Five Lives must never overwrite one another.
const fiveConfig={id:'five-123',players:[{id:'a',name:'A'},{id:'b',name:'B'}]};
const chaseConfig={...fiveConfig,id:'chase-123',variantId:'chase'};
assert.equal(writeDartsMatchDraft('five_lives',fiveConfig,{players:[],events:[{turn:1}],currentThrow:[]}),true);
assert.equal(writeDartsMatchDraft('chase',chaseConfig,{players:[],events:[{turn:2}],currentThrow:[]}),true);
assert.equal(readDartsMatchDraft('chase').config.id,'chase-123');
clearDartsMatchDraft('chase');
assert.equal(readDartsMatchDraft('chase'),null);
assert.equal(readDartsMatchDraft('five_lives').config.id,'five-123');

// Never put an avatar or a large image in the local draft.
const giant='data:image/png;base64,'+'x'.repeat(200_000);
writeDartsMatchDraft('halve_it',{sessionId:'halve123',avatarDataUrl:giant},{state:{history:[]}});
assert.equal(readDartsMatchDraft('halve_it').config.avatarDataUrl,null);
const key=[...store.keys()].find(k=>k.endsWith('halve_it'));
const altered=JSON.parse(store.get(key));
altered.version=2;store.set(key,JSON.stringify(altered));
assert.equal(readDartsMatchDraft('halve_it'),null,'version mismatch rejected');

// Invariants on the routes and game pages.
for (const p of ['src/pages/FiveLivesConfig.tsx','src/pages/HalveItConfig.tsx']) {
  assert.match(code(p),/DartsResumeDraftCard/);
  assert.match(code(p),/clearDartsMatchDraft/);
}
for (const p of ['src/pages/FiveLivesPlay.tsx','src/pages/HalveItPlay.tsx']) {
  assert.match(code(p),/readDartsMatchDraft/);
  assert.match(code(p),/writeDartsMatchDraft/);
  assert.match(code(p),/clearDartsMatchDraft/);
}
assert.match(code('src/App.tsx'),/resumeDraft=\{routeParams\?\.resumeDraft === true\}/);
assert.match(code('src/pages/FiveLivesPlay.tsx'),/onFinish\?\.\(finalMatch, \{ navigate: false \}\)/,'automatic history save at the end');
assert.match(code('src/components/DartsResumeDraftCard.tsx'),/window\.confirm/,'explicit abandonment');

console.log('PASS V141 — 4 isolated local draft slots, resumed rounds/darts, history auto-save, invalid/oversize drafts.');
