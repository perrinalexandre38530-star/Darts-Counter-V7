import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');
const sharedConfig = read('src/pages/Wave61SharedConfig.tsx');
const panels = read('src/pages/wave61/Wave61SurvivalCombatPanels.tsx');

assert(engine.includes('WAVE61_ENGINE_VERSION = 14'), 'Wave61 V14 moteur absent');

const cases = {
  hot_potato: ['fuseLength','passFuseBonus','explosionDamage'],
  zombie_siege: ['infectionPowerPct','barricadePowerPct','curePowerPct'],
  le_loup: ['catchLives','escapePowerPct','bullProtectionCharges'],
  eperviers: ['catchThreshold','crossingGoal','runPowerPct'],
  ballon_prisonnier: ['damagePowerPct','shieldCap','releaseHealth'],
  iceberg: ['compartmentGoal','floodPowerPct','pumpPowerPct'],
  apocalypse: ['refugeGoal','disasterThreshold','medkitPowerPct'],
  spartacus: ['startingArmor','guardCap','attackPowerPct'],
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

for (const key of ['crossingGoal','compartmentGoal','refugeGoal']) assert(sharedConfig.includes(key), `Goal dynamique ${key} absent de Config`);
assert(panels.includes('modeOptions?.crossingGoal'), 'Panel Éperviers non dynamique');
assert(panels.includes('modeOptions?.compartmentGoal'), 'Panel Iceberg non dynamique');
assert(panels.includes('modeOptions?.refugeGoal'), 'Panel Apocalypse non dynamique');
for (const token of ['hotPotatoFuseReset(state.config)','infectionPowerPct','catchLives','crossingGoal','damagePowerPct','compartmentGoal','disasterThreshold','startingArmor']) assert(engine.includes(token), `Câblage moteur ${token} absent`);

console.log('✅ Wave61 V16 — cinquième lot de finitions individuelles');
console.log('✅ HOT POTATO / ZOMBIE SIEGE / LE LOUP / LES ÉPERVIERS');
console.log('✅ BALLON PRISONNIER / ICEBERG / APOCALYPSE / SPARTACUS');
console.log('✅ Goals dynamiques + panels + moteur V14');
