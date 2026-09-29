import { DARTS_WAVE_61 } from '../src/games/dartsWave61';
import { cloneWave61State, createWave61State, getWave61Target, pickWave61BotDarts, playWave61Visit } from '../src/lib/gameEngines/wave61Engine';
import type { GameDart, Player } from '../src/lib/types-game';

function assert(ok: unknown, msg: string): asserts ok { if (!ok) throw new Error(msg); }
const players: Player[] = [{id:'p1',name:'Alpha'},{id:'p2',name:'Bravo'},{id:'p3',name:'Charlie'},{id:'p4',name:'Delta'}];
const fallback: GameDart[] = [{bed:'S',number:20},{bed:'T',number:20},{bed:'IB'}];
function finiteRecord(rec: Record<string, number> | undefined, label: string, id: string) {
  for (const [key, value] of Object.entries(rec || {})) assert(Number.isFinite(Number(value)), `${id}: ${label}.${key}=${String(value)}`);
}

let visits = 0;
for (const spec of DARTS_WAVE_61) {
  const rawConfig = { selectedIds: players.map(p=>p.id), players: players.length, playersList: players, difficulty:'normal', botLevel:'normal', rounds:8, goal:12, lives:3, randomOrder:false, participantMode: spec.supportsTeams ? 'teams' : 'players', teamByPlayer:{p1:'A',p2:'B',p3:'A',p4:'B'}, modeOptions:{ v26Sentinel: 261 }, targetAdviceEnabled:true, awenaCommentaryEnabled:true, wave61SfxEnabled:true };
  let state = createWave61State(players, spec.id, rawConfig);
  assert(state.modeId === spec.id && state.phase === 'playing', `${spec.id}: init invalide`);
  assert(state.config.modeOptions?.v26Sentinel === 261, `${spec.id}: modeOptions perdu à l'init`);
  assert(state.special && state.special.version, `${spec.id}: special absent`);

  for (let turn=0; turn<24 && state.phase === 'playing'; turn++) {
    const before = cloneWave61State(state);
    const target = getWave61Target(state); // doit rester sûr sur tous les états
    void target;
    let darts = pickWave61BotDarts(state, 'normal');
    if (!Array.isArray(darts) || darts.length === 0) darts = fallback;
    assert(darts.length <= 3, `${spec.id}: bot > 3 fléchettes`);
    state = playWave61Visit(state, darts);
    visits++;
    assert(state.modeId === spec.id, `${spec.id}: modeId muté`);
    assert(state.config.modeOptions?.v26Sentinel === 261, `${spec.id}: modeOptions perdu après volée`);
    assert(Array.isArray(state.visits), `${spec.id}: visits invalide`);
    assert(state.activePlayerIndex >= 0 && state.activePlayerIndex < state.players.length, `${spec.id}: activePlayerIndex hors limites`);
    assert(state.roundIndex >= 0 && state.turnIndex >= 0, `${spec.id}: round/turn négatif`);
    finiteRecord(state.scores,'scores',spec.id); finiteRecord(state.progress,'progress',spec.id); finiteRecord(state.health,'health',spec.id); finiteRecord(state.lives,'lives',spec.id); finiteRecord(state.teamScores,'teamScores',spec.id);
    for (const [pid, st] of Object.entries(state.statsByPlayer || {})) for (const [k,v] of Object.entries(st as any)) assert(Number.isFinite(Number(v)), `${spec.id}: stats ${pid}.${k}=${String(v)}`);

    // Simulation sauvegarde -> JSON/IndexedDB -> reprise.
    const resumed = cloneWave61State(JSON.parse(JSON.stringify(state)));
    assert(resumed.config.modeOptions?.v26Sentinel === 261, `${spec.id}: modeOptions perdu à la reprise`);
    assert(JSON.stringify(resumed.special) === JSON.stringify(state.special), `${spec.id}: special altéré à la reprise`);
    state = resumed;

    // L'état précédent doit rester réutilisable par Undo sans mutation rétroactive.
    assert(before.modeId === spec.id && before.config.modeOptions?.v26Sentinel === 261, `${spec.id}: snapshot Undo corrompu`);
  }

  if (state.phase === 'finished') {
    assert(Boolean(state.winnerId || state.winnerTeamId), `${spec.id}: partie finie sans vainqueur`);
    assert(Number.isFinite(Number(state.finishedAt)), `${spec.id}: finishedAt absent`);
    const frozen = JSON.stringify(state);
    const after = playWave61Visit(state, fallback);
    assert(JSON.stringify(after) === frozen, `${spec.id}: accepte encore une volée après victoire`);
  }
}

for (const id of ['mistigri','radin','corbeau_renard','darts_impossible']) assert(DARTS_WAVE_61.some(m=>m.id===id), `${id}: nouveau mode absent du catalogue`);
console.log(`✅ Wave61 V26 — runtime/gameplay agressif: ${DARTS_WAVE_61.length}/65 modes · ${visits} volées simulées`);
console.log('✅ Bots · NaN/undefined numériques · tours · snapshot Undo · save/resume · modeOptions/special · arrêt après victoire');
