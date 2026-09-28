import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');
const racePanels = read('src/pages/wave61/Wave61RacePanels.tsx');
const partyPanels = read('src/pages/wave61/Wave61PartyArcadePanels.tsx');

assert(engine.includes('WAVE61_ENGINE_VERSION = 15'), 'Wave61 V15 moteur absent');

const cases = {
  un_deux_trois_soleil: ['movePowerPct','stopPenalty','freezeBonus'],
  chat_souris: ['mouseHeadStart','movementPowerPct','bullShortcutPct'],
  maze_chase: ['ghostGap','ghostAdvance','bullPowerCharge'],
  chien_chat: ['bonusMove','bullShortcut','routePowerPct'],
  roller_coaster: ['dangerLimit','missSpeedLoss','bullBoostPct'],
  athletisme: ['scoreMultiplierPct','sprintTripleBonus','relayPerfectBonus'],
  chute_libre: ['startAltitude','fallSpeedPct','parachuteWindowPct'],
  tyrolien: ['startSpeed','boostPowerPct','windPenalty'],
  saut_a_la_corde: ['missJumpPenalty','paceStep','bullJumpBonusPct'],
  final_buzzer: ['fixedCutoff','clutchBonus','streakCap'],
};

for (const [id, keys] of Object.entries(cases)) {
  const cfg = read(`src/pages/wave61/modes/${id}Config.tsx`);
  const play = read(`src/pages/wave61/modes/${id}Play.tsx`);
  assert(cfg.includes('dedicatedOptions={DEDICATED_OPTIONS}'), `${id}: options dédiées absentes`);
  assert(play.includes('dedicatedPlayHint='), `${id}: hint Play absent`);
  for (const key of keys) {
    assert(cfg.includes(`key: "${key}"`), `${id}: option ${key} absente`);
    assert(engine.includes(`"${key}"`), `moteur: ${key} absent`);
    assert(sharedPlay.includes(key), `HUD Play: ${key} absent`);
  }
}

assert(engine.includes('wave61FinalBuzzerCutoff'), 'Helper cutoff Final Buzzer absent');
assert(partyPanels.includes('wave61FinalBuzzerCutoff'), 'Panel Final Buzzer non synchronisé au cutoff dédié');
assert(racePanels.includes('modeOptions?.startAltitude'), 'Panel Chute Libre non dynamique');
assert(engine.includes('freefallWindow(state.config.difficulty, state.config)'), 'Fenêtre parachute dédiée non câblée');
assert(engine.includes('modeOptionNumber(state.config, "ghostGap"'), 'Ghost gap Maze non câblé');
assert(engine.includes('modeOptionNumber(state.config, "paceStep"'), 'Rythme saut à la corde non câblé');

console.log('✅ Wave61 V17 — sixième lot de finitions individuelles');
console.log('✅ 1,2,3 SOLEIL / CHAT & SOURIS / MAZE CHASE / CHIEN & CHAT');
console.log('✅ ROLLER COASTER / ATHLÉTISME / CHUTE LIBRE / TYROLIEN');
console.log('✅ SAUT À LA CORDE / FINAL BUZZER');
console.log('✅ 51 modes individualisés sur 61');
