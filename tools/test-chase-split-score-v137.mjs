// MULTISPORTS SCORING — tests ciblés du patch CHASE + SPLIT SCORE depuis V136.
// Exécuter : node --experimental-strip-types tools/test-chase-split-score-v137.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  createHalveItState,
  playHalveItVisit,
  halveItTargetScore,
  targetFromId,
  cloneHalveItState,
} from '../src/lib/gameEngines/halveItEngine.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const code = (name) => readFileSync(resolve(root, name), 'utf8');
const TARGETS = ['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'];
const RULES = {
  participantMode:'players',sequencePreset:'extended9',customTargets:TARGETS,
  startMode:'fixed', fixedStartingScore:40, rounding:'floor',
};
const players=[{id:'one',name:'One'},{id:'two',name:'Two'}];
let s=createHalveItState(players,RULES,[],['one','two']);
assert.deepEqual(s.targets.map((t)=>t.id),TARGETS,'parcours officiel');
assert.deepEqual(s.scoresByPlayer,{one:40,two:40},'capital de départ');
assert.equal(halveItTargetScore(targetFromId('n15'),{bed:'D',number:15}),30);
assert.equal(halveItTargetScore(targetFromId('n15'),{bed:'S',number:20}),0);
assert.equal(halveItTargetScore(targetFromId('double_any'),{bed:'IB'}),50,'DBULL = double 25');
assert.equal(halveItTargetScore(targetFromId('double_any'),{bed:'T',number:20}),0);
assert.equal(halveItTargetScore(targetFromId('triple_any'),{bed:'T',number:20}),60);
assert.equal(halveItTargetScore(targetFromId('triple_any'),{bed:'D',number:20}),0);
assert.equal(halveItTargetScore(targetFromId('bull'),{bed:'OB'}),25);
assert.equal(halveItTargetScore(targetFromId('bull'),{bed:'IB'}),50);
const miss={bed:'MISS'};
function volley(...darts) { s=playHalveItVisit(s,darts); }
// 2 joueurs : mêmes cibles avant de passer à la cible suivante.
volley({bed:'T',number:15},{bed:'S',number:20},miss);
assert.equal(s.scoresByPlayer.one,85);
assert.equal(s.roundIndex,0);
assert.equal(s.turnOrder[s.activePlayerIndex],'two');
volley(miss,miss,miss);
assert.equal(s.scoresByPlayer.two,20);
assert.equal(s.roundIndex,1);
volley(miss,miss,miss);
assert.equal(s.scoresByPlayer.one,42,'85/2 -> 42 (arrondi inférieur)');
volley({bed:'S',number:16},{bed:'D',number:16},miss);
assert.equal(s.scoresByPlayer.two,68,'20 + 16 + 32');
assert.equal(s.roundIndex,2);
let past=cloneHalveItState(s);
volley({bed:'IB'},{bed:'D',number:20},miss);
assert.equal(s.scoresByPlayer.one,132,'Double round: 42+50+40');
s=past;
assert.equal(s.scoresByPlayer.one,42,'Undo/clonage restaure le total');
volley({bed:'IB'},{bed:'D',number:20},miss);
volley(miss,miss,miss);
// Manches suivantes, contrôle de fin / classements / stats.
while(!s.finished) {
  const target=s.targets[s.roundIndex];
  let darts=[miss,miss,miss];
  if(target.kind==='number') darts=[{bed:'S',number:target.value},miss,miss];
  if(target.kind==='triple') darts=[{bed:'T',number:20},miss,miss];
  if(target.kind==='bull') darts=[{bed:'OB'},miss,miss];
  volley(...darts);
}
assert.equal(s.history.length,18,'9 manches × 2 joueurs');
assert.equal(s.roundIndex,9);
assert.ok(s.standings.length===2 && s.winnerIds.length>0);
assert.ok(s.statsByPlayer.one.visits===9 && s.statsByPlayer.two.visits===9);
assert.ok(s.statsByPlayer.one.halvingEvents>=1);
const registry=code('src/games/dartsGameRegistry.ts');
const ids=[...registry.matchAll(/\n\s+id:\s*"(split_score|chase)"/g)].map(m=>m[1]);
assert.deepEqual(ids.sort(),['chase','split_score']);
assert.match(registry,/statsKey: "game:split_score"/);
assert.match(registry,/statsKey: "game:five_lives"/);
assert.match(code('src/pages/Games.tsx'),/tab:halve_it_config\?variantId=split_score/);
assert.match(code('src/pages/Games.tsx'),/tab:five_lives_config\?variantId=chase/);
assert.match(code('src/pages/HalveItConfig.tsx'),/const SPLIT_SCORE_TARGETS = \["n15", "n16", "double_any", "n17", "n18", "triple_any", "n19", "n20", "bull"\]/);
assert.match(code('src/pages/HalveItConfig.tsx'),/startMode: isSplitScore \? "fixed" : startMode/);
assert.match(code('src/pages/HalveItConfig.tsx'),/fixedStartingScore: isSplitScore \? 40 : fixedStartingScore/);
assert.match(code('src/pages/HalveItPlay.tsx'),/kind: modeId, mode: modeId/);
assert.match(code('src/pages/FiveLivesPlay.tsx'),/chaseRoundQueue/);
assert.match(code('src/pages/FiveLivesConfig.tsx'),/const chaseActive = chasePreset;/,'RELAIS conservé');
for(const lang of ['fr','en']) for(const id of ['chase','split_score']) {
  assert.ok(existsSync(resolve(root,`src/assets/tickers/ticker_${id}_${lang}.webp`)));
  assert.match(code(`src/i18n/${lang}.ts`),new RegExp(`landing\\.game\\.${id}\\.info`));
}
for(const id of ['chase','split_score']){
  assert.match(code('src/pages/PublicLandingPage.tsx'),new RegExp(`${id}:`));
  assert.match(code('src/config/androidStoreV1.ts'),new RegExp(`"${id}"`));
}
assert.match(code('src/pages/PublicLandingPage.tsx'), /landingTickerFor\("tossit_games"/, 'préserver la correction TOSSIT de la base V136');
const statsHub=code('src/pages/StatsHub.tsx');
const splitStats=code('src/components/stats/HalveItStatsTabFull.tsx');
assert.match(statsHub,/currentMode === "halve_it" \|\| currentMode === "split_score"/);
assert.match(statsHub,/mode=\{currentMode === "split_score" \? "split_score" : "halve_it"\}/);
assert.match(splitStats,/if \(mode === "split_score"\) return blob\.includes\("split_score"\)/);
assert.match(code('src/pages/HalveItConfig.tsx'),/<RulesContent primary=\{primary\} isSplitScore=\{isSplitScore\}/);
console.log('OK — CHASE + SPLIT SCORE : scoring 9 manches, doubles/bull, vies, routing, historique, UI, assets FR/EN.');
