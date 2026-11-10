import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHALLENGE_ARCADE_CATALOG,isArcadeChallengePlayable} from '../src/lib/challengeArcadeCatalog.ts';
import {CHALLENGE_MODE_OPTIONS,EXISTING_CHALLENGE_MODES,CHALLENGE_MODE_FAMILIES,selectedChallengeMode} from '../src/lib/challengeUnifiedCatalog.ts';
import {BOARD_CLOCKWISE,arcadeObjectives,evaluateArcadeProgress,oppositeSector,currentArcadePlayer,isArcadeObjectiveHit} from '../src/lib/challengeArcadeEngine.ts';

assert.equal(CHALLENGE_ARCADE_CATALOG.length,44,'42 concepts + Perfect Line + Opposés');
assert.equal(new Set(CHALLENGE_ARCADE_CATALOG.map(x=>x.id)).size,44,'all unique');
assert.equal(CHALLENGE_ARCADE_CATALOG.filter(x=>x.status==='ready').length,44,'all CHALLENGE arcade engines implemented');
assert.ok(isArcadeChallengePlayable('perfect-line'));
assert.ok(isArcadeChallengePlayable('opposites'));
assert.ok(isArcadeChallengePlayable('snake'));

const line={catalogChallengeId:'perfect-line',catalogLine:17,catalogVariant:'classic',catalogRounds:5};
assert.deepEqual(arcadeObjectives(line).map(x=>x.label),['D17','G17','T17','P17','BULL 25','DBULL 50']);
assert.deepEqual(arcadeObjectives({...line,catalogLine:20}).map(x=>x.label),['D20','G20','T20','P20','BULL 25','DBULL 50']);
const hits=[
 {pid:'A',zone:'D',segment:17},
 {pid:'A',zone:'P',segment:17}, // incorrect when G is required
 {pid:'A',zone:'G',segment:17},
 {pid:'A',zone:'T',segment:17},
 {pid:'A',zone:'P',segment:17},
 {pid:'A',zone:'BULL',segment:null},
 {pid:'A',zone:'DBULL',segment:null},
];
let p=evaluateArcadeProgress(hits,line);
assert.equal(p.complete,true);
assert.equal(p.attempts,7);
assert.equal(p.successes,6);
assert.equal(p.accuracy,85.7);
assert.equal(evaluateArcadeProgress(hits.slice(0,-1),line).current?.label,'DBULL 50');
assert.equal(isArcadeObjectiveHit({zone:'P',segment:20,label:'P20'},{pid:'A',zone:'G',segment:20}),false);
assert.equal(isArcadeObjectiveHit({zone:'G',segment:20,label:'G20'},{pid:'A',zone:'P',segment:20}),false);

for(const number of BOARD_CLOCKWISE){
 assert.equal(oppositeSector(oppositeSector(number)),number);
 assert.notEqual(oppositeSector(number),number);
}
assert.equal(oppositeSector(20),3);
assert.equal(oppositeSector(1),19);
for(const [variant,label] of [['classic','S'],['doubles','D'],['triples','T']]){
 const opposite={catalogChallengeId:'opposites',catalogLine:20,catalogVariant:variant,catalogRounds:1};
 assert.deepEqual(arcadeObjectives(opposite).map(x=>x.label),[`${label}20`,`${label}3`]);
}
const opposite={catalogChallengeId:'opposites',catalogLine:20,catalogVariant:'doubles',catalogRounds:1};
assert.equal(evaluateArcadeProgress([{pid:'A',zone:'G',segment:20}],opposite).index,0);
assert.equal(evaluateArcadeProgress([{pid:'A',zone:'D',segment:20}],opposite).index,1);
const multiplayer=[{pid:'A',zone:'D',segment:20},{pid:'A',zone:'D',segment:3}];
assert.equal(currentArcadePlayer(multiplayer,['A','B'],opposite),'B');
assert.equal(currentArcadePlayer([],['A','B'],opposite),'A');
assert.equal(currentArcadePlayer([{pid:'A',zone:'D',segment:20}],['A','B'],opposite),'A');
assert.equal(currentArcadePlayer([{pid:'A',zone:'MISS',segment:null},{pid:'A',zone:'MISS',segment:null},{pid:'A',zone:'MISS',segment:null}],['A','B'],opposite),'B');
const cfg=fs.readFileSync('src/pages/ChallengeConfig.tsx','utf8');
assert.equal(EXISTING_CHALLENGE_MODES.length,7,'existing exercises preserved');
assert.equal(CHALLENGE_MODE_OPTIONS.length,51,'single selection: 7 historical + 44 new');
assert.equal(new Set(CHALLENGE_MODE_OPTIONS.map(x=>x.id)).size,51,'unique choices');
assert.equal(CHALLENGE_MODE_FAMILIES.length,7,'seven unified families');
assert.equal(CHALLENGE_MODE_OPTIONS.filter(x=>x.state==='available').length,51,'existing and all new modes available');
assert.equal(CHALLENGE_MODE_OPTIONS.filter(x=>x.state==='preview').length,0,'no preview-only cards remain');
assert.equal(CHALLENGE_MODE_OPTIONS.filter(x=>x.state==='planned').length,0,'no proposed challenge stays locked');
assert.equal(selectedChallengeMode('jdc')?.id,'jdc');
assert.equal(selectedChallengeMode('arcade','perfect-line')?.id,'arcade:perfect-line');
for(const family of CHALLENGE_MODE_FAMILIES) assert.ok(CHALLENGE_MODE_OPTIONS.some(x=>x.family===family));
assert.ok(cfg.includes('CHALLENGE_MODE_FAMILIES.map'),'category presentation required');
assert.ok(cfg.includes('filteredChoices.map') || cfg.includes('choices.map(choice'),'all families use same card component');
assert.ok(cfg.includes('chooseUnifiedMode(choice)'),'existing and new games must share one selector');
assert.ok(!cfg.includes('CATALOGUE · 44 CHALLENGES'),'no separate catalog mode');
assert.ok(!cfg.includes('const catalogStage='),'no second catalog page');
assert.ok(cfg.includes('const arcadeStage='),'new games have their own configuration stage');
assert.ok(cfg.includes("exerciseType==='arcade'?[arcadeStage]"),'arcade stage routed to selected mode');
assert.ok(fs.readFileSync('.gitignore','utf8').includes('*.wgt'),'Tizen package ignored');
assert.ok(cfg.includes("isArcadeChallengePlayable(catalogChallengeId)"));
const play=fs.readFileSync('src/pages/ChallengePlay.tsx','utf8');
assert.ok(play.includes("if(cfg?.exerciseType==='arcade')return <ChallengeArcadePlay"));
console.log('✅ CHALLENGE V128 : sélection unique 51 défis / 7 familles, nouveaux moteurs jouables, historiques préservés.');
