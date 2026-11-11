/** V153 — layout responsive CHASE/5 VIES + HALVE-IT/SPLIT SCORE, sans perte de brouillon. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createHalveItState, playHalveItVisit } from '../src/lib/gameEngines/halveItEngine.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>readFileSync(resolve(root,rel),'utf8');
const lives=read('src/pages/FiveLivesPlay.tsx');
const livesCss=read('src/pages/FiveLivesPlayResponsive.css');
const halve=read('src/pages/HalveItPlay.tsx');
const halveCss=read('src/pages/HalveItPlayResponsive.css');

for(const x of ['msc-five-lives-body','msc-five-lives-overview','msc-five-lives-input']) {
 assert.ok(lives.includes(x), `Structure absente: ${x}`);
 assert.ok(livesCss.includes(x), `Style absent: ${x}`);
}
assert.match(lives,/import "\.\/FiveLivesPlayResponsive\.css"/);
assert.match(livesCss,/overflow-y:\s*auto/);
assert.match(livesCss,/grid-template-columns:\s*minmax\(300px,\s*46%\)/);
assert.match(livesCss,/env\(safe-area-inset-bottom\)|max-height:\s*min\(55dvh/);
assert.match(halve,/className="msc-halveit-standings-strip"/);
assert.match(halve,/state\.standings\.map\(\(standing\)/);
assert.doesNotMatch(halve,/state\.standings\.slice\(0, 4\)/);
assert.match(halve,/standing\.id === activePlayerId/);
assert.match(halve,/standing\.id === activeTeamId/);
assert.match(halve,/aria-current=\{isActive/);
assert.match(halveCss,/\.msc-halveit-standings-strip/);
assert.match(halveCss,/overflow-x:\s*auto/);
const reset=halve.slice(halve.indexOf('function resetMatch()'),halve.indexOf('function backToConfig()'));
assert.match(reset,/clearDartsMatchDraft\(draftMode, getStorageUser\(\)\)/);
assert.ok(reset.indexOf('clearDartsMatchDraft(draftMode, getStorageUser())')<reset.indexOf('matchIdRef.current ='));
assert.match(halve,/isSplitScore \? "split_score" : "halve_it"/);
assert.match(lives,/isChase \? "chase" : "five_lives"/);

// Scoring partagé inchangé après mise en page : les deux joueurs parcourent
// l'itinéraire officiel en 9 manches et la pénalité est individuelle.
const players=Array.from({length:12},(_,i)=>({id:`p${i+1}`,name:`Joueur ${i+1}`}));
const targets=['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'];
let state=createHalveItState(players,{participantMode:'players',sequencePreset:'extended9',customTargets:targets,startMode:'fixed',fixedStartingScore:40,rounding:'floor'});
assert.equal(state.players.length,12);
assert.deepEqual(state.targets.map(t=>t.id),targets);
const miss={bed:'MISS'};
state=playHalveItVisit(state,[{bed:'T',number:15},miss,miss]);
state=playHalveItVisit(state,[miss,miss,miss]);
assert.equal(state.scoresByPlayer.p1,85);
assert.equal(state.scoresByPlayer.p2,20);
assert.equal(state.statsByPlayer.p2.halvingEvents,1);
assert.equal(state.standings.length,12);
console.log('PASS V153 — 12 participants consultables, actif indiqué, layouts portrait/paysage, reset du brouillon, moteur conservé.');
