import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');
const missionPanels = read('src/pages/wave61/Wave61MissionAdventurePanels.tsx');
const partyPanels = read('src/pages/wave61/Wave61PartyArcadePanels.tsx');

assert(engine.includes('WAVE61_ENGINE_VERSION = 16'), 'Wave61 V16 moteur absent');

const cases = {
  heist_180: ['phaseNeed','heatGain','bullCooling'],
  escape_game: ['directStepPower','bullJokerPower','penaltyBackAfter'],
  objectif_lune: ['fuelGainPct','stabilityLoss','fuelMinimum'],
  hollywood: ['sceneNeed','starPowerPct','boxOfficePct'],
  calendrier_maya: ['sealNeed','doomGain','bullDoomRelief'],
  jardinier: ['waterStart','waterDrain','harvestGoal'],
  microscopia: ['contaminationGain','bullDecontam','qualityPowerPct'],
  disjoncte: ['hitOverloadPct','wrongOverload','bullCooling'],
  petit_bac: ['directAdvance','bullAdvance','validationBonus'],
  jackpot: ['basePot','potGrowth','payoutMultiplierPct'],
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

const modeDir='src/pages/wave61/modes';
const configs=fs.readdirSync(modeDir).filter((name)=>name.endsWith('Config.tsx'));
const EXPECTED = 65;
assert(configs.length === EXPECTED, `${EXPECTED} Config attendues, trouvé ${configs.length}`);
for (const name of configs) {
  const text=read(`${modeDir}/${name}`);
  assert(text.includes('dedicatedOptions={DEDICATED_OPTIONS}'), `${name}: finition individuelle manquante`);
}

assert(missionPanels.includes('modeOptions?.harvestGoal'), 'Panel Jardinier non dynamique');
assert(partyPanels.includes('modeOptions?.basePot'), 'Panel Jackpot non dynamique');
assert(engine.includes('penaltyBackAfter'), 'Recul Escape Game non câblé');
assert(engine.includes('payoutMultiplierPct'), 'Multiplicateur Jackpot non câblé');

console.log('✅ Wave61 V18 — septième et dernier lot de finitions individuelles');
console.log('✅ HEIST 180 / ESCAPE GAME / OBJECTIF LUNE / HOLLYWOOD / CALENDRIER MAYA');
console.log('✅ LE JARDINIER / MICROSCOPIA / DISJONCTÉ / LE PETIT BAC / JACKPOT');
console.log(`✅ ${EXPECTED}/${EXPECTED} modes disposent désormais de réglages Config dédiés enrichis`);
