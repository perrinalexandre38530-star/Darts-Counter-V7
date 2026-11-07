#!/usr/bin/env node
/**
 * V202 — tests fonctionnels du moteur réel des huit nouveaux modes.
 * Lance avec `node tools/test-wave61-eight-modes-runtime-v202.mjs`.
 * Ne nécessite pas de navigateur ; utilise le compilateur TypeScript du projet.
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
  // Workstations may provide tsc globally, without npm ci in this extraction.
  const tscBinary = realpathSync(execFileSync('which', ['tsc'], { encoding: 'utf8' }).trim());
  ts = require(path.join(path.dirname(path.dirname(tscBinary)), 'lib/typescript.js'));
}
require.extensions['.ts'] = (module, filename) => {
  const text = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(text, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(compiled, filename);
};

const { createWave61State, cloneWave61State, getWave61Target, pickWave61BotDarts, playWave61Visit } = require('../src/lib/gameEngines/wave61Engine.ts');
const MODES = ['black_vs_white', 'three_colors', 'la_suite', 'color_call', 'bim_bam_boum', 'saute_moutons', 'troupeau_en_danger', 'une_ptite_raclette'];
const P = [{id:'p1',name:'A'}, {id:'p2',name:'B'}, {id:'p3',name:'C'}, {id:'p4',name:'D'}];
const IDS = P.map(p=>p.id);
const TEAMS = {p1:'A',p2:'B',p3:'A',p4:'B'};
const miss = () => ({bed:'MISS'});
const S = n => ({bed:'S',number:n});
const D = n => ({bed:'D',number:n});
const T = n => ({bed:'T',number:n});
const OB = () => ({bed:'OB'});
const IB = () => ({bed:'IB'});
const init = (modeId, opts={}) => createWave61State(P.slice(0, opts.players ?? 2), modeId, {
  selectedIds: IDS.slice(0, opts.players ?? 2), players: opts.players ?? 2,
  randomOrder:false, participantMode: opts.teams ? 'teams' : 'players',
  teamByPlayer: TEAMS, rounds: opts.rounds ?? 10, goal: opts.goal ?? (modeId==='une_ptite_raclette'?3:20),
  lives:8, difficulty:opts.level??'normal', botLevel:opts.level??'normal', modeOptions: opts.modeOptions??{},
});
const play = (state, darts) => playWave61Visit(state, darts);
const jsonClone = s => JSON.parse(JSON.stringify(s));
function finiteState(state, tag) {
  assert(MODES.includes(state.modeId), `${tag}: modeId perdu`);
  assert(state.activePlayerIndex >= 0 && state.activePlayerIndex < state.players.length, `${tag}: index invalide`);
  assert(state.phase === 'playing' || state.phase === 'finished', `${tag}: phase invalide`);
  for (const record of [state.scores, state.progress, state.teamScores, state.health, state.lives]) {
    for (const [key, val] of Object.entries(record || {})) assert(Number.isFinite(val), `${tag}: ${key}=${val} non fini`);
  }
  for (const [id, stats] of Object.entries(state.statsByPlayer)) {
    for (const [field,val] of Object.entries(stats)) assert(Number.isFinite(val), `${tag}/${id}: stats.${field} non fini`);
    assert(stats.hits <= stats.darts, `${tag}/${id}: ${stats.hits} touches pour ${stats.darts} fléchettes`);
    assert(stats.hits >= 0, `${tag}/${id}: touches négatives`);
    assert(stats.visits <= stats.darts || stats.darts===0, `${tag}/${id}: visites incohérentes`);
  }
  const visit = state.visits.at(-1);
  if (visit) {
    assert(visit.darts.length <= 3, `${tag}: plus de trois fléchettes`);
    assert(visit.hits >= 0 && visit.hits <= visit.darts.length, `${tag}: ${visit.hits} touches sur ${visit.darts.length} fléchettes`);
    assert(Number.isFinite(visit.delta), `${tag}: delta non fini`);
  }
  if (state.phase === 'finished') {
    assert(state.winnerId || state.winnerTeamId, `${tag}: aucun vainqueur`);
    assert(Number.isFinite(state.finishedAt), `${tag}: finishedAt absent`);
  }
}

// Reproducible BOT paths: failures can be replayed without a random seed hunt.
let rng = 0x20261107;
Math.random = () => { rng = (Math.imul(rng,1664525)+1013904223)>>>0; return rng/0x100000000; };
let visits = 0;
let finished = 0;
// Real engine under easy/normal/hard, individual/team, including JSON save-resume and Undo.
for (const mode of MODES) for (const teams of [false,true]) for (const level of ['easy','normal','hard']) {
  let s = init(mode, {players:4, teams, level, rounds:14, goal: mode==='une_ptite_raclette'?3:20});
  for (let n=0; n<60 && s.phase==='playing'; n++) {
    const previous = cloneWave61State(s);
    getWave61Target(s);
    const darts = pickWave61BotDarts(s, level);
    assert(Array.isArray(darts) && darts.length > 0 && darts.length <= 3, `${mode}: BOT ${level} fléchettes invalides`);
    s = play(s, darts);
    visits++;
    finiteState(s, `${mode}/${teams?'teams':'players'}/${level}/volée${n+1}`);
    assert.deepEqual(cloneWave61State(previous),previous, `${mode}: snapshot Undo modifié`);
    s = cloneWave61State(jsonClone(s));
    assert(s.modeId===mode && s.config.modeId===mode, `${mode}: mode perdu à la reprise`);
    assert.deepEqual(s.special,jsonClone(s).special, `${mode}: état métier non sérialisable`);
  }
  if(s.phase==='finished') {
    finished++;
    assert.deepEqual(play(s,[S(20),T(20),IB()]), s, `${mode}: volée acceptée après victoire`);
  }
}

// Scénarios dirigés pour les quatre variantes (contrats, erreurs et bonus).
{
  let s=init('black_vs_white',{modeOptions:{firstTrack:'black',dtRule:'bonus',bullRule:'bonus',wrongColorPenalty:5,missPenalty:5}});
  assert.equal(s.special.blackWhiteColorByPlayer.p1,'BLACK');
  s=play(s,[S(20),D(20),S(1)]);
  assert.equal(s.scores.p1,55,'BLACK VS WHITE: score d’une touche S/D correcte et d’une couleur adverse');
  assert.equal(s.special.blackWhiteWrongColorByPlayer.p1,1,'BLACK VS WHITE: mauvaise couleur non comptée');
  assert.equal(s.visits.at(-1).hits,2,'BLACK VS WHITE: touches effectives incorrectes');
}
{
  let s=init('three_colors',{modeOptions:{bullColors:'colors',scoreMode:'real',perfectVisitBonus:10,invalidVisitPenalty:7}});
  s=play(s,[S(20),S(1),D(1)]); // BLACK, WHITE, GREEN
  assert.equal(s.scores.p1,33,'LES 3 COULEURS: trois couleurs et bonus non validés');
  assert.equal(s.special.threeColorsValidVisitsByPlayer.p1,1,'LES 3 COULEURS: volée parfaite manquante');
  s=play(s,[S(20),S(20),S(20)]);
  assert.equal(s.special.threeColorsInvalidVisitsByPlayer.p2,1,'LES 3 COULEURS: répétition de couleur acceptée');
  assert.equal(s.scores.p2,0,'LES 3 COULEURS: pénalité sous zéro');
}
{
  let s=init('la_suite',{modeOptions:{sequenceOrder:'ascending',sequenceScoring:'real',doublesTriples:'allowed',perfectVisitBonus:5,invalidVisitPenalty:7}});
  s=play(s,[S(1),D(2),T(3)]);
  assert.equal(s.scores.p1,1+4+9+5,'LA SUITE: progression strictement croissante non validée');
  assert.equal(s.special.laSuiteCurrentStreakByPlayer.p1,1,'LA SUITE: série correcte absente');
  s=play(s,[S(3),S(2),S(1)]);
  assert.equal(s.special.laSuiteInvalidVisitsByPlayer.p2,1,'LA SUITE: ordre décroissant accepté en strict');
}
{
  let s=init('color_call',{modeOptions:{scoreMode:'real',wrongColorPenalty:5,missPenalty:5,perfectBonus:10}});
  s.special.colorCallSequence=['BLACK','WHITE','GREEN','RED'];
  s=play(s,[S(20),S(20),S(20)]);
  assert.equal(s.scores.p1,70,'COLOR CALL: triple appel BLACK et bonus erronés');
  assert.equal(s.special.colorCallPerfectVisitsByPlayer.p1,1,'COLOR CALL: appel parfait absent');
  s=play(s,[S(20),miss(),S(1)]); // target WHITE, wrong, MISS, correct
  assert.equal(s.visits.at(-1).hits,1,'COLOR CALL: appel WHITE attribué incorrectement');
  assert.equal(s.special.colorCallPenaltyByPlayer.p2,10,'COLOR CALL: pénalités mauvaise couleur/MISS erronées');
}

// Prédicats précis pour les mécaniques des modes FUN.
{
  let s=init('bim_bam_boum',{modeOptions:{comboRule:'same',comboBonus:50,missPenalty:10}});
  s=play(s,[S(20),D(20),T(20)]);
  assert.equal(s.progress.p1,1,'BIM: premier combo non validé');
  assert.equal(s.scores.p1,20+40+60+50,'BIM: score combo erroné');
  s=play(s,[miss(),miss(),miss()]);
  assert.equal(s.special.bimBamBoumFailedByPlayer.p2,1,'BIM: échec absent');
  assert.equal(s.special.bimBamBoumStreakByPlayer.p2,0,'BIM: streak non réinitialisé');
}
{
  let s=init('saute_moutons',{goal:12,modeOptions:{trackLength:12,leapfrogBonus:2,bull25Jump:4,bull50Jump:6}});
  s=play(s,[S(1),D(2),OB()]);
  assert.equal(s.progress.p1,7,'SAUTE: saut S/D/BULL25 incorrect');
  assert.equal(s.statsByPlayer.p1.hits,3,'SAUTE: hits doivent compter les fléchettes réellement utiles');
  s=play(s,[miss(),miss(),miss()]);
  assert.equal(s.progress.p2,0,'SAUTE: MISS fait avancer');
  s=play(s,[IB(),IB(),miss()]);
  assert.equal(s.progress.p1,12,'SAUTE: borne de fin de piste incorrecte');
  assert.equal(s.phase,'finished','SAUTE: victoire non détectée');
}
{
  let s=init('troupeau_en_danger',{modeOptions:{flockSize:4,wolfDifficulty:'hard',patouPower:0,shepherdSave:true}});
  s=play(s,[miss(),miss(),miss()]);
  assert.equal(s.special.flockRemainingByPlayer.p1,1,'TROUPEAU: pertes sur MISS erronées');
  s=play(s,[IB(),miss(),miss()]);
  assert.equal(s.special.flockRemainingByPlayer.p2,4,'TROUPEAU: Berger doit limiter perte de moutons');
  assert.equal(s.special.troupeauSheepLostByPlayer.p2||0,0,'TROUPEAU: mouton sauvé compté comme perdu');
}
{
  let s=init('une_ptite_raclette',{goal:2,modeOptions:{recipeCheese:2,recipePotato:1,recipeCharcuterie:1,racletteBonus:100,visitVarietyBonus:15,missPenalty:5}});
  s=play(s,[D(1),S(2),S(3)]);
  assert.equal(s.progress.p1,1,'RACLETTE: recette complète non servie');
  assert.equal(s.scores.p1,2+2+3+100+15,'RACLETTE: bonus recette/plateau erronés');
  assert.equal(s.statsByPlayer.p1.hits,3,'RACLETTE: une touche par fléchette');
  assert.equal(s.special.racletteStockByPlayer.p1.cheese,0,'RACLETTE: fromage non consommé');
  s=play(s,[miss(),miss(),miss()]);
  assert.equal(s.scores.p2,0,'RACLETTE: score négatif après MISS');
  s=play(s,[IB(),miss(),miss()]);
  assert.equal(s.progress.p1,2,'RACLETTE: Bull ne sert pas la nouvelle recette');
  assert.equal(s.phase,'finished','RACLETTE: victoire après service non détectée');
}
console.log(`✅ V202 — ${MODES.length} modes · ${visits} volées BOT réelles · 48 parcours (3 niveaux × solo/teams) · ${finished} fins de partie`);
console.log('✅ Assertions : scoring, MISS, Bulls, recettes, défense, combos, sauvegarde/reprise JSON, Undo, victoire, NaN, touches≤fléchettes');
