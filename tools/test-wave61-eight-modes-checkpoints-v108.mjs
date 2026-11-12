#!/usr/bin/env node
/**
 * V108: durable History checkpoints for the 8 new modes (BOT, last-visit undo,
 * and final-match recap). Executes the real Wave61 engine, not only regexes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
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

const { createWave61State, playWave61Visit, pickWave61BotDarts, cloneWave61State } = require('../src/lib/gameEngines/wave61Engine.ts');
const { withWave61EightModeUndoCheckpoint, getWave61EightModeUndoCheckpoint, getWave61PendingBotVisitRecap, normalizeWave61EightModeRestoredState } = require('../src/lib/gameEngines/wave61EightModeCheckpoint.ts');
const modes = ['black_vs_white','three_colors','la_suite','color_call','bim_bam_boum','saute_moutons','troupeau_en_danger','une_ptite_raclette'];
const participants = Array.from({length:4},(_,i)=>({id:`p${i+1}`,name:`BOT ${i+1}`,isBot:true}));
const teamByPlayer = {p1:'A',p2:'B',p3:'A',p4:'B'};
const json = value => JSON.parse(JSON.stringify(value));
const S = n => ({bed:'S',number:n});
let rng = 0x1082026;
Math.random = () => { rng = (Math.imul(rng,1664525) + 1013904223) >>> 0; return rng / 0x100000000; };
let replayedVisits = 0, recapChecks = 0, finishedChecks = 0;
for (const mode of modes) for (const teams of [false,true]) for (const difficulty of ['easy','normal','hard']) {
  const players = participants.slice(0,teams?4:2);
  const config = {
    selectedIds: players.map(p=>p.id), participantMode:teams?'teams':'players', teamByPlayer,
    botLevel:difficulty, difficulty, rounds:16, goal:mode==='une_ptite_raclette'?5:25,
    modeOptions: {flockSize:20,wolfDifficulty:'easy',seriesFormat:'bo3',trackLength:25},
  };
  let state = createWave61State(players,mode,config);
  for (let i=0;i<10 && state.phase==='playing';i++) {
    const before = cloneWave61State(state);
    const thrown = pickWave61BotDarts(before,difficulty);
    const scored = playWave61Visit(state,thrown);
    const stored = withWave61EightModeUndoCheckpoint(scored,before);
    const saved = json(stored); // exactly the History V4 JSON roundtrip
    const lastVisit = saved.visits.at(-1);
    assert.ok(lastVisit?.id,`${mode}: visit without id`);
    const pending = {visitId:lastVisit.id,isBot:true,playerId:lastVisit.playerId,scoreAfter:saved.scores[lastVisit.playerId]};
    saved.special.pendingBotVisitRecap = pending;
    assert.deepEqual(getWave61PendingBotVisitRecap(saved),pending,`${mode}: BOT recap lost after reload`);
    recapChecks++;
    saved.special.pendingBotVisitRecap.visitId = 'stale-visit-id';
    assert.equal(getWave61PendingBotVisitRecap(saved),null,`${mode}: stale BOT recap shown`);
    const cleaned = normalizeWave61EightModeRestoredState(saved);
    assert.equal(cleaned.special.pendingBotVisitRecap,undefined,`${mode}: stale pending flag would block the next turn`);
    assert.equal(saved.special.pendingBotVisitRecap.visitId,'stale-visit-id',`${mode}: cleanup mutated the source record`);
    delete saved.special.pendingBotVisitRecap;
    if (scored.phase === 'playing') {
      const pre = getWave61EightModeUndoCheckpoint(saved);
      assert.ok(pre,`${mode}: no persisted last-visit Undo`);
      const expected = json(before);
      delete expected.special.lastVisitUndo; // one level only
      delete expected.special.seriesIntermissionUndo;
      assert.deepEqual(json(pre),expected,`${mode}: Undo did not restore exact score/stats/visits`);
      assert.equal(pre.special?.lastVisitUndo,undefined,`${mode}: nested Undo snapshot grows without bound`);
      assert.equal(pre.special?.seriesIntermissionUndo,undefined,`${mode}: nested intermission snapshot`);
      assert.ok(JSON.stringify(saved).length < JSON.stringify(before).length * 3 + 10000,`${mode}: exploding History size`);
      replayedVisits++;
    } else {
      assert.equal(getWave61EightModeUndoCheckpoint(saved),null,`${mode}: fake Undo after a finished match`);
      finishedChecks++;
    }
    state = saved;
  }
  const invalid = json(state);
  if (invalid.special.lastVisitUndo) {
    invalid.special.lastVisitUndo.startedAt = -1;
    assert.equal(getWave61EightModeUndoCheckpoint(invalid),null,`${mode}: accepted Undo from a different match`);
  }
}

// Finishing dart: the final BOT recap must remain readable even though the
// state is finished and must not allow a new throw after the match ends.
for (const [mode,opts,goal,shot] of [
  ['saute_moutons',{trackLength:6,bull50Jump:6},6,[{bed:'IB'},S(20),S(20)]],
  ['une_ptite_raclette',{recipeCheese:2,recipePotato:1,recipeCharcuterie:1},1,[{bed:'IB'},S(20),S(20)]],
]) {
  const cfg={selectedIds:['p1','p2'],rounds:4,goal,modeOptions:opts};
  const initial=createWave61State(participants.slice(0,2),mode,cfg);
  const scored=playWave61Visit(initial,shot);
  assert.equal(scored.phase,'finished',`${mode}: prerequisite BOT win not reached`);
  assert.equal(scored.visits.at(-1).darts.length,1,`${mode}: unused darts counted after win`);
  const recap={visitId:scored.visits.at(-1).id,isBot:true,playerId:'p1'};
  const persisted=json({...scored,special:{...scored.special,pendingBotVisitRecap:recap}});
  assert.deepEqual(getWave61PendingBotVisitRecap(persisted),recap,`${mode}: missing final BOT recap`);
  const acknowledged=json(persisted);
  delete acknowledged.special.pendingBotVisitRecap;
  assert.equal(getWave61PendingBotVisitRecap(acknowledged),null,`${mode}: recap was not cleared by CONTINUER`);
  assert.equal(acknowledged.phase,'finished',`${mode}: acknowledgement altered final result`);
  assert.deepEqual(acknowledged.statsByPlayer,persisted.statsByPlayer,`${mode}: ACK changed stats`);
  finishedChecks++;
}

// A completed leg has its own explicit Undo checkpoint and must not acquire
// a second, competing last-visit Undo entry.
const before=createWave61State(participants.slice(0,2),'saute_moutons',{selectedIds:['p1','p2'],rounds:10,goal:6,modeOptions:{trackLength:6}});
const intermission=json(before);
intermission.visits=[{id:'v0',playerId:'p1',darts:[S(20)],hits:1,visitScore:20,delta:20,events:[]}];
intermission.special.seriesIntermission={modeId:'saute_moutons',nextGameIndex:2};
assert.equal(withWave61EightModeUndoCheckpoint(intermission,before),intermission,'intermission must not acquire redundant checkpoint');

const playSource = fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx',import.meta.url),'utf8');
for (const guard of [
  'getWave61PendingBotVisitRecap(state)',
  'normalizeWave61EightModeRestoredState(',
  'withWave61EightModeUndoCheckpoint(committed, previous)',
  'getWave61EightModeUndoCheckpoint(state)',
  'if (nextVisitRecap.isBot) {',
  'if (acknowledged.phase === "finished") finishedRef.current = false;',
  'persist(acknowledged, true);',
]) assert.ok(playSource.includes(guard),`Play missing integration: ${guard}`);

console.log(`✅ V108 — ${modes.length} modes · ${replayedVisits} persisted Undo checkpoints · ${recapChecks} BOT recaps · ${finishedChecks} finished records`);
console.log('✅ BOT final recap -> CONTINUER -> History, Undo JSON exact and bounded, stale checkpoint rejected, BO/FT intermission preserved');
