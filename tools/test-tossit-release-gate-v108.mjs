/** TOSSIT V108 RELEASE GATE — 18 modes, match completion, undo, resume,
 * public catalogue, home routing, mobile contracts, History V4 acknowledgement.
 * Run from repo root: node --experimental-strip-types tools/test-tossit-release-gate-v108.mjs
 * Browser/device visual acceptance remains a separate, manual activity.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TOSSIT_MODES, TOSSIT_CHORES, applyTossitAction, newTossitGame, summaryForTossit, undoTossitAction } from '../src/pages/tossit/tossitEngine.ts';
import { encodeTossitDraft, decodeTossitDraft } from '../src/pages/tossit/tossitDraft.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = p => readFileSync(p, 'utf8');
const players = [{ id:'alice', name:'Alice' }, { id:'bob', name:'Bob' }];
const supported = m => TOSSIT_MODES.some(x => x.id === m);
const expectedModes = [
  'classic', 'speed', 'target', 'duel', 'border', 'tictac', 'battle', 'sniper', 'conquest',
  'river', 'cornhole', 'goalkeeper', 'football_pitch', 'thief_cop', 'reach', 'rainbow', 'chores', 'bottle',
];
assert.deepEqual(TOSSIT_MODES.map(x => x.id), expectedModes, '18 stable IDs; preserve old history/backup compatibility');
assert.equal(new Set(TOSSIT_MODES.map(x => x.id)).size, 18, 'unique mode IDs');

function setup(mode) {
  const darts = ['duel', 'football_pitch', 'river', 'thief_cop'].includes(mode) ? 6 : 3;
  return newTossitGame(mode, players, darts, 1_700_000_000_000 + expectedModes.indexOf(mode) * 1000, 4,
    ['battle', 'conquest', 'reach', 'rainbow', 'chores', 'bottle'].includes(mode) ? 3 : mode === 'thief_cop' ? 2 : undefined);
}
function actionFor(s) {
  const a='alice', b='bob', n=s.dartsPerPlayer;
  switch (s.mode) {
    case 'classic': return {kind:'classic',playerId:a,closestDarts:2,kiss:0,frenchKiss:0,jackiss:false,jackissExtra:0,jumpover:false,jackover:true};
    case 'speed': return {kind:'speed',stuck:{[a]:3,[b]:1},kiss:{[a]:0,[b]:0},jumpoverWinnerId:a};
    case 'target': return {kind:'target',hits:s.players[s.nextPlayerIndex].id===a ? (s.scores[a]===20 ? [1,0,0] : [3,3,3]) : [0,0,0]};
    case 'duel': return {kind:'duel',stuck:6,jackStuck:true,kiss:2,jumpover:5};
    case 'border': return {kind:'border',valid:{[a]:[1,2,3],[b]:[]},wrongSide:{[a]:0,[b]:0}};
    case 'tictac': {
      const order=[0,4,1,5,2]; return {kind:'tictac',cell:order[s.events.length]};
    }
    case 'battle': return {kind:'battle',stuck:{[a]:3,[b]:0},jackStuck:true,closestPlayerId:a};
    case 'sniper': return {kind:'sniper',outcome:'ultimate',playerId:a};
    case 'conquest': return {kind:'conquest',color:'Rouge',required:1,stuck:{[a]:1,[b]:0}};
    case 'river': return {kind:'river',landings:Array.from({length:n},()=>({kind:'opponent',points:3})),kiss:0,jumpover:false};
    case 'cornhole': return {kind:'cornhole',throws:{[a]:s.scores[a]===18 ? ['hole','miss','miss'] : ['hole','hole','hole'],[b]:['miss','miss','miss']},kiss:{[a]:0,[b]:0},jumpover:{[a]:0,[b]:0}};
    case 'goalkeeper': return {kind:'goalkeeper',zones:[3,3,3]};
    case 'football_pitch': return {kind:'football_pitch',outcome:s.players[s.nextPlayerIndex].id===s.pitch.attackerId?(s.pitch.chainLength?'goal':'centre'):'miss'};
    case 'thief_cop': return {kind:'thief_cop',captures:[s.events.length === 0 ? 'direct' : 'miss',...Array(n-1).fill('miss')]};
    case 'reach': return {kind:'reach',bestCm:s.nextPlayerIndex===0?150:80,stuck:2};
    case 'rainbow': return {kind:'rainbow',pattern:'ring',colors:s.nextPlayerIndex===0?4:3,stackHeight:0,completed:true};
    case 'chores': return {kind:'chores',throws:[{effect:'chore',recipientId:a,chore:TOSSIT_CHORES[0].id},{effect:'miss'},{effect:'miss'}]};
    case 'bottle': return {kind:'bottle',stuck:{[a]:2,[b]:1},onBottle:{[a]:1,[b]:0},closestPlayerId:a};
    default: throw new Error(`Unknown mode ${s.mode}`);
  }
}
let actionCount=0;
for (const mode of expectedModes) {
  let game=setup(mode);
  assert.equal(game.events.length,0);
  assert.equal(game.finished,false);
  const first = applyTossitAction(game,actionFor(game),game.createdAt+1);
  assert.equal(first.events.length,1,`${mode}: first event`);
  assert.deepEqual(undoTossitAction(first).scores,game.scores,`${mode}: undo restores exact scores`);
  assert.equal(undoTossitAction(first).finished,false,`${mode}: undo restores active game`);
  assert.throws(()=>applyTossitAction(game,{kind:'invalid'}),/Action incompatible/,`${mode}: reject foreign action`);
  if (!first.finished) {
    const encoded=encodeTossitDraft(first);
    assert.ok(encoded,`${mode}: interrupted draft retained`);
    const restored=decodeTossitDraft(encoded,supported);
    assert.ok(restored,`${mode}: compatible resume`);
    assert.deepEqual(restored.scores,first.scores,`${mode}: resume score`);
    assert.equal(restored.events.length,1,`${mode}: resume events`);
    assert.equal(undoTossitAction(restored).events.length,0,`${mode}: undo after resume`);
  }
  game=first;
  for (let i=0;!game.finished && i<150;i++) {
    game=applyTossitAction(game,actionFor(game),game.createdAt+i+2);
  }
  assert.ok(game.finished,`${mode}: reaches a natural finished state`);
  assert.ok(game.events.length<=150,`${mode}: bounded finish`);
  for(const player of players) assert.ok(Number.isFinite(game.scores[player.id]),`${mode}: finite score ${player.id}`);
  assert.equal(encodeTossitDraft(game),null,`${mode}: finished match not treated as interrupted`);
  const summary=summaryForTossit(game);
  assert.equal(summary.sport,'tossit');
  assert.equal(summary.mode,mode);
  assert.equal(summary.rounds,game.events.length);
  assert.equal(summary.perPlayer.length,2);
  assert.equal(summary.finished,true);
  if (mode === 'chores') { assert.equal(summary.nonCompetitive,true); assert.equal(summary.winnerId,null); }
  assert.equal(undoTossitAction(game).finished,false,`${mode}: can undo final result at engine level`);
  actionCount+=game.events.length;
  console.log(`✓ ${mode.padEnd(16)} ${String(game.events.length).padStart(2)} entries · ${game.winnerId || 'draw'}`);
}

const screen=read('src/pages/tossit/TossitScreens.tsx');
const home=read('src/pages/tossit/TossitHome.tsx');
const app=read('src/App.tsx');
const css=read('src/pages/tossit/tossitResponsive.css');
const publicPage=read('src/pages/PublicLandingPage.tsx');
const draft=read('src/pages/tossit/tossitDraft.ts');
assert.match(app,/case "home":\s*page\s*=\s*activeSport === "tossit"\s*\?\s*\(\s*<TossitHome/);
assert.match(app,/case "games":\s*page\s*=\s*activeSport === "tossit"\s*\?\s*\(\s*<TossitMenu/);
assert.match(app,/case "tossit_play":\s*page = <TossitPlay/);
assert.match(home,/SportHomeWelcomeHeader sport="tossit"/);
assert.match(screen,/History\.list\(\)/);
assert.match(publicPage,/TOSSIT_MODES\.map\(/, 'public mode listing must be data-driven');
assert.match(draft,/previous: state\.previous \? \{ \.\.\.state\.previous, previous: null \}/);
assert.match(screen,/if \(!state\.finished\) writeDraft\(state\)/, 'keep previous draft until History V4 confirms');
assert.match(screen,/clearDraftForMatch\(match\.createdAt\)/, 'remove only this match draft after confirmed write');
assert.match(app,/return upsertPromise;/, 'History V4 persistence must be awaitable');
assert.match(screen,/const result = await onFinish\?\.\(match\)/, 'UI waits for actual persistence result');
assert.match(screen,/if \(result !== true\)/, 'UI does not claim unconfirmed save');
assert.match(screen,/completedMatch\.current = match/, 'retry preserves the same match ID');
assert.match(screen,/id: tossitMatchId\(state\)/, 'match ID stable across retry and resume');
assert.match(screen,/saveFinishedMatch\(completedMatch\.current\)/, 'explicit retry');
assert.match(screen,/historyStatus === "failed"/, 'save failure is visible');
assert.match(screen,/window\.confirm\(tr\(/, 'new match needs overwrite confirmation when draft exists');
assert.match(css,/\.tossit-save-failed/);
for (const key of ['orientation: landscape', 'overflow-y: auto', 'touch-action: manipulation', 'safe-area-inset-bottom']) assert.ok((screen+css).includes(key),`mobile ${key}`);
for (const file of ['src/assets/tossit/tossit_menu_decor.webp','src/assets/tickers/ticker_tossit_games.webp']) assert.ok(existsSync(file),`asset ${file}`);
for (const path of ['src/pages/tossit/TossitScreens.tsx','src/App.tsx','src/pages/tossit/tossitEngine.ts']) {
  const transpile=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
  assert.equal(transpile.diagnostics?.length||0,0,`${path}: no syntax diagnostics`);
}
console.log(`\nTOSSIT V108 RELEASE GATE OK: ${expectedModes.length} natural completions, ${actionCount} entries, undo, resume, results, history acknowledgement, routing, FR/EN/public, mobile contracts.`);
