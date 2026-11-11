#!/usr/bin/env node
/**
 * V165 — simulation réelle de manches + décision BO/FT et sauvegardes JSON.
 * Sans navigateur, reproductible ; teste les 8 variantes et modes FUN.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch {
  const binary = realpathSync(execFileSync('which', ['tsc'], { encoding: 'utf8' }).trim());
  ts = require(path.join(path.dirname(path.dirname(binary)), 'lib/typescript.js'));
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const { createWave61State, cloneWave61State, playWave61Visit } = require('../src/lib/gameEngines/wave61Engine.ts');
const { decideWave61SeriesLeg } = require('../src/lib/gameEngines/wave61SeriesDecision.ts');
const modes = ['black_vs_white','three_colors','la_suite','color_call','bim_bam_boum','saute_moutons','troupeau_en_danger','une_ptite_raclette'];
const players = [{id:'p1',name:'Joueur 1'},{id:'p2',name:'Joueur 2'},{id:'p3',name:'Joueur 3'},{id:'p4',name:'Joueur 4'}];
const teamByPlayer = {p1:'A',p2:'B',p3:'A',p4:'B'};
const S = number => ({bed:'S',number});
const D = number => ({bed:'D',number});
const T = number => ({bed:'T',number});
const IB = () => ({bed:'IB'});
const MISS = () => ({bed:'MISS'});
const clone = v => JSON.parse(JSON.stringify(v));
const play = (s,darts) => playWave61Visit(s,darts);

// Ne pas reprendre un snapshot avec les fléchettes qui n'ont jamais été jouées.
for (const teamMode of [false,true]) {
  const participants = players.slice(0,teamMode?4:2);
  const config = (mode, modeOptions, goal) => ({
    selectedIds:participants.map(p=>p.id), participantMode:teamMode?'teams':'players', teamByPlayer,
    rounds:10,goal,lives:8,randomOrder:false,difficulty:'normal',botLevel:'normal',modeOptions,
  });
  for (const [mode,opts,goal,winning] of [
    ['saute_moutons',{trackLength:6,bull50Jump:6,leapfrogBonus:1},6,[IB(),D(20),T(20)]],
    ['une_ptite_raclette',{recipeCheese:2,recipePotato:1,recipeCharcuterie:1,racletteBonus:100,visitVarietyBonus:15,missPenalty:5},1,[IB(),D(20),T(20)]],
  ]) {
    const initial = createWave61State(participants,mode,config(mode,opts,goal));
    const initialSnapshot = clone(initial);
    const finished = play(initial,winning);
    assert.equal(finished.phase,'finished',`${mode}: victoire au premier dart`);
    assert.equal(finished.statsByPlayer.p1.darts,1,`${mode}: le dart gagnant seul doit compter`);
    assert.equal(finished.statsByPlayer.p1.hits,1,`${mode}: une touche jouée`);
    assert.equal(finished.statsByPlayer.p1.rawPoints,50,`${mode}: seuls les points du DBULL comptent`);
    assert.equal(finished.statsByPlayer.p1.bestVisit,50,`${mode}: meilleure volée brute`);
    assert.equal(finished.statsByPlayer.p1.doubles,0,`${mode}: D20 non joué`);
    assert.equal(finished.statsByPlayer.p1.triples,0,`${mode}: T20 non joué`);
    assert.equal(finished.statsByPlayer.p1.bulls,1,`${mode}: un DBULL joué`);
    assert.equal(finished.visits.at(-1).darts.length,1,`${mode}: History garde un dart`);
    assert.equal(finished.visits.at(-1).visitScore,50,`${mode}: History ne compte pas le score non joué`);
    assert.deepEqual(clone(initial),initialSnapshot,`${mode}: Undo intact`);
    assert.deepEqual(clone(cloneWave61State(clone(finished))),clone(finished),`${mode}: reprise JSON sans perte`);
    assert.deepEqual(play(finished,[S(20)]),finished,`${mode}: aucun tir après victoire`);
  }
}

// Victoire au deuxième dart : le troisième ne doit pas être compté.
for (const [mode, goal, opts, thrown, expectedRaw] of [
  ['saute_moutons', 8, {trackLength:8,bull50Jump:6,leapfrogBonus:0}, [IB(),D(20),T(20)], 90],
  ['une_ptite_raclette', 1, {recipeCheese:2,recipePotato:1,recipeCharcuterie:1,racletteBonus:100,visitVarietyBonus:15}, [D(1),IB(),T(20)], 52],
]) {
  const cfg = {selectedIds:['p1','p2'],participantMode:'players',teamByPlayer,rounds:8,goal,randomOrder:false,modeOptions:opts};
  const state = play(createWave61State(players.slice(0,2),mode,cfg),thrown);
  assert.equal(state.phase,'finished',`${mode}: victoire sur le deuxième dart`);
  assert.equal(state.visits.at(-1).darts.length,2,`${mode}: le troisième dart n'a pas été joué`);
  assert.equal(state.statsByPlayer.p1.darts,2,`${mode}: stats de deux fléchettes`);
  assert.equal(state.statsByPlayer.p1.rawPoints,expectedRaw,`${mode}: points des deux darts réellement joués`);
  assert.equal(state.visits.at(-1).visitScore,expectedRaw,`${mode}: History reste cohérent`);
}

// Sécurité : une sauvegarde d'équipe plus ancienne peut contenir winnerId
// et teamByPlayer, mais pas encore winnerTeamId.
const fallback = decideWave61SeriesLeg({format:'bo3',teamMode:true,teamByPlayer,winnerId:'p3',previousWins:{'team:A':1},gameIndex:2});
assert.equal(fallback.winnerKey,'team:A');
assert.equal(fallback.winnerTeamId,'A');
assert.equal(fallback.wins['team:A'],2);
assert.equal(fallback.matchWon,true);
assert.equal(fallback.completedGameIndex,2);
const missing = decideWave61SeriesLeg({format:'ft3',teamMode:true,teamByPlayer,previousWins:{'team:A':1},gameIndex:2});
assert.equal(missing.matchWon,true,'pas de boucle CONTINUER infinie sans vainqueur');
assert.equal(missing.wins['team:A'],1,'aucune victoire inventée');

let seriesCount = 0, legsCount = 0, visitsCount = 0;
let rng = 0x20261111;
Math.random = () => {rng = (Math.imul(rng,1664525)+1013904223)>>>0; return rng/0x100000000;};
for (const mode of modes) for (const format of ['bo3','ft3']) for (const teams of [false,true]) {
  const count = teams ? 4 : 2;
  const participants = players.slice(0,count);
  const cfg = {
    selectedIds:participants.map(p=>p.id), participantMode:teams?'teams':'players', teamByPlayer,
    rounds:1,goal:mode==='une_ptite_raclette'?1:20,lives:8,randomOrder:false,difficulty:'normal',botLevel:'normal',
    modeOptions:{seriesFormat:format,recipeCheese:2,recipePotato:1,recipeCharcuterie:1,racletteBonus:50,flockSize:12, wolfDifficulty:'easy'},
  };
  let wins = {}, index = 1, champion = null;
  const winsTo = format==='bo3'?2:3;
  for (let leg = 1; leg <= 5; leg++) {
    let state = createWave61State(participants,mode,cfg);
    const initial = clone(state);
    for (let i=0;i<20 && state.phase==='playing';i++) {
      state = play(state,[S(20),D(20),T(20)]);
      visitsCount++;
    }
    assert.equal(state.phase,'finished',`${mode}/${format}/${teams}: manche ${leg} jamais terminée`);
    assert.ok(state.winnerId || state.winnerTeamId,`${mode}/${format}/${teams}: vainqueur absent`);
    const decision = decideWave61SeriesLeg({format,teamMode:teams,teamByPlayer:cfg.teamByPlayer,winnerId:state.winnerId,winnerTeamId:state.winnerTeamId,previousWins:wins,gameIndex:index});
    assert.ok(decision.winnerKey,`${mode}: pas de clé gagnante`);
    assert.equal(decision.completedGameIndex,leg);
    assert.equal(decision.nextGameIndex,leg+1);
    assert.equal(Object.values(decision.wins).reduce((a,b)=>a+b,0),leg,`${mode}: victoire comptée deux fois`);
    if (teams) assert.ok(decision.winnerKey.startsWith('team:'),`${mode}: score collectif attribué à un joueur`);
    assert.deepEqual(clone(decision),decision,`${mode}: décision non sérialisable`);
    assert.deepEqual(clone(state.modeId),mode,`${mode}: identifiant du mode perdu`);
    legsCount++;
    wins=clone(decision.wins);
    index=decision.nextGameIndex;
    if (decision.matchWon) {champion=decision.winnerKey;break;}
    // Le checkpoint de transition est restauré avant CONTINUER.
    const saved = clone({
      modeId:mode,phase:'playing',special:{seriesIntermission:{winnerKey:decision.winnerKey,wins:decision.wins,completedGameIndex:leg,nextGameIndex:index},seriesIntermissionUndo:initial},
    });
    assert.equal(saved.special.seriesIntermission.nextGameIndex,index);
    assert.deepEqual(saved.special.seriesIntermissionUndo,initial);
    // CONTINUER supprime les deux marqueurs; la prochaine manche garde l'historique.
    delete saved.special.seriesIntermission;
    delete saved.special.seriesIntermissionUndo;
    assert.deepEqual(saved.special,{});
  }
  assert.ok(champion,`${mode}/${format}/${teams}: série non achevée`);
  assert.equal(wins[champion],winsTo,`${mode}/${format}/${teams}: résultat BO/FT incorrect`);
  seriesCount++;
}

const playSource = fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx',import.meta.url),'utf8');
assert.match(playSource,/decideWave61SeriesLeg\(/,'l\'interface Play utilise la décision de série testée');
assert.match(playSource,/state\.special\?\.seriesIntermission/,'pause intermission câblée');
assert.match(playSource,/persist\(restored, true\)/,'annulation sauvegardée');
console.log(`✅ V165 — ${seriesCount} séries BO3/FT3 · ${legsCount} manches moteur · ${visitsCount} volées · 8 modes · individus/équipes`);
console.log('✅ Décision série, vainqueur collectif, sauvegarde/reprise JSON, CONTINUER/UNDO, victoire au dart 1, KPI/History corrigés');
