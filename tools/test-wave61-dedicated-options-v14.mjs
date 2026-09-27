import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');

assert(engine.includes('WAVE61_ENGINE_VERSION = 12'), 'Wave61 V12 moteur absent');

const cases = {
  poseidon: ['captureThreshold','territoryGoal','resourceBoost'],
  cosmo_knights: ['burstThreshold','burstDamage','shieldCap'],
  draco_spheres: ['energyThreshold','bullEnergy','tripleEnergy'],
  mythologie: ['trialNeed','favorThreshold','bullFavor'],
  cheval_de_troie: ['alertGain','bullStealth','phaseNeedBonus'],
  sabaudia_dauphine: ['captureThreshold','territoryGoal','baseFort'],
  galaxies: ['captureThreshold','territoryGoal','resourceBoost'],
  jurassic_dart: ['attackThreshold','tranquilizerPower','securityDamage'],
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

for (const id of ['poseidon','cosmo_knights','draco_spheres']) {
  assert(fs.existsSync(`src/assets/tickers/ticker_${id}.webp`), `${id}: ticker manquant`);
}

for (const token of ['burstThreshold','energyThreshold','favorThreshold','alertGain','attackThreshold','conquestVictoryGoal']) {
  assert(engine.includes(token), `câblage moteur ${token} absent`);
}

console.log('✅ Wave61 V14 — troisième lot de finitions individuelles');
console.log('✅ POSÉIDON / COSMO KNIGHTS / DRACO SPHERES');
console.log('✅ MYTHOLOGIE / CHEVAL DE TROIE / SABAUDIA & DAUPHINÉ / GALAXIES / JURASSIC DART');
console.log('✅ 3 tickers + options dédiées + moteur V12');
