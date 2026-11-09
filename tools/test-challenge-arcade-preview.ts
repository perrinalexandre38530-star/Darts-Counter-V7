import assert from 'node:assert/strict';
import {CHALLENGE_ARCADE_CATALOG,isArcadeChallengePlayable} from '../src/lib/challengeArcadeCatalog.ts';
import {BOARD_CLOCKWISE,arcadeObjectives,evaluateArcadeProgress,oppositeSector,currentArcadePlayer} from '../src/lib/challengeArcadeEngine.ts';
import type {ArcadeHit,ArcadePlayConfig} from '../src/lib/challengeArcadeEngine.ts';

const all=CHALLENGE_ARCADE_CATALOG;
assert.equal(all.length,44,'42 proposals + Perfect Line + Opposites');
assert.equal(new Set(all.map(item=>item.id)).size,44,'no duplicate IDs');
assert.equal(all.filter(item=>item.status==='ready').length,2,'preview catalog must not advertise unfinished modes as playable');
assert.ok(isArcadeChallengePlayable('perfect-line'));
assert.ok(isArcadeChallengePlayable('opposites'));
assert.ok(!isArcadeChallengePlayable('snake'));
const line:ArcadePlayConfig={catalogChallengeId:'perfect-line',catalogLine:17,catalogVariant:'classic',catalogRounds:5};
assert.deepEqual(arcadeObjectives(line).map(row=>row.label),['D17','G17','T17','P17','BULL 25','DBULL 50']);
const throws:ArcadeHit[]=[
 {pid:'A',zone:'D',segment:17},
 {pid:'A',zone:'P',segment:17}, // wrong: required G
 {pid:'A',zone:'G',segment:17},
 {pid:'A',zone:'T',segment:17},
 {pid:'A',zone:'P',segment:17},
 {pid:'A',zone:'BULL',segment:null},
 {pid:'A',zone:'DBULL',segment:null},
];
const result=evaluateArcadeProgress(throws,line);
assert.equal(result.complete,true);
assert.equal(result.attempts,7);
assert.equal(result.successes,6);
assert.equal(result.accuracy,85.7);
assert.equal(evaluateArcadeProgress(throws.slice(0,-1),line).current?.label,'DBULL 50');
for(const sector of BOARD_CLOCKWISE){
 assert.equal(oppositeSector(oppositeSector(sector)),sector);
 assert.notEqual(oppositeSector(sector),sector);
}
assert.equal(oppositeSector(20),3);
assert.equal(oppositeSector(1),19);
const opposite:ArcadePlayConfig={catalogChallengeId:'opposites',catalogLine:20,catalogVariant:'doubles',catalogRounds:1};
assert.deepEqual(arcadeObjectives(opposite).map(row=>row.label),['D20','D3']);
assert.equal(evaluateArcadeProgress([{pid:'A',zone:'G',segment:20}],opposite).index,0);
assert.equal(evaluateArcadeProgress([{pid:'A',zone:'D',segment:20}],opposite).index,1);
const group:ArcadeHit[]=[{pid:'A',zone:'D',segment:20},{pid:'A',zone:'D',segment:3}];
assert.equal(currentArcadePlayer(group,['A','B'],opposite),'B','completed player must yield immediately');
console.log('✅ CHALLENGE ARCADE PREVIEW — 44 cards, 2 playable engines, exact P/G and opposite sectors');
