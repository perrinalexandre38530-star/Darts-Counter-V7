import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedConfig = read('src/pages/Wave61SharedConfig.tsx');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');

assert(/WAVE61_ENGINE_VERSION = (?:10|[1-9][0-9]+)/.test(engine), 'Wave61 V10 moteur absent');
assert(sharedConfig.includes('Wave61DedicatedOption'), 'Schéma options dédiées absent');
assert(sharedConfig.includes('modeOptions'), 'Persist/payload modeOptions absent');
assert(engine.includes('modeOptions?: Record<string, any>'), 'Mode options non normalisées dans le moteur');
assert(sharedPlay.includes('RÉGLAGES MODE'), 'Résumé des réglages dédiés absent du Play');

const cases = {
  demineur: ['mineCount','scannerStrength','mineDamage'],
  align_4: ['connectLength','bullColumn'],
  codebreaker: ['codeLength','allowRepeats'],
  face_mystere: ['cluesPerMiss'],
  colin_maillard: ['sequenceLength','previewMs'],
  luciole: ['revealMs','wrongPenalty'],
  golden_dart: ['cluesPerMiss'],
  sniper: ['headshotBonus'],
};
for (const [id, keys] of Object.entries(cases)) {
  const cfg = read(`src/pages/wave61/modes/${id}Config.tsx`);
  const play = read(`src/pages/wave61/modes/${id}Play.tsx`);
  assert(cfg.includes('dedicatedOptions={DEDICATED_OPTIONS}'), `${id}: options dédiées non câblées`);
  assert(play.includes('dedicatedPlayHint='), `${id}: Play dédié non enrichi`);
  for (const key of keys) assert(cfg.includes(`key: "${key}"`), `${id}: option ${key} absente`);
}

for (const token of ['mineCount','scannerStrength','mineDamage','connectLength','bullColumn','codeLength','allowRepeats','cluesPerMiss','sequenceLength','wrongPenalty','headshotBonus']) {
  assert(engine.includes(`"${token}"`), `Moteur non câblé pour ${token}`);
}
assert(sharedPlay.includes('config?.modeOptions?.revealMs'), 'Durée Luciole non câblée dans le Play');
assert(sharedPlay.includes('config?.modeOptions?.previewMs'), 'Durée Colin-Maillard non câblée dans le Play');

console.log('✅ Wave61 V12 — premier lot de finitions individuelles');
console.log('✅ DÉMINEUR / ALIGN 4 / CODEBREAKER / FACE MYSTÈRE');
console.log('✅ COLIN-MAILLARD / LUCIOLE / GOLDEN DART / SNIPER');
console.log('✅ Options dédiées persistées + moteur + HUD Play');
