import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');

assert(/WAVE61_ENGINE_VERSION = (?:13|1[4-9]|[2-9][0-9]);/.test(engine), 'Wave61 V13 ou supérieur attendu');

const cases = {
  tug_rush: ['pullPowerPct','slipPenalty','bullBoostPct'],
  replicat: ['copyPoints','perfectBonus','failurePenalty'],
  double_down: ['missPenaltyPercent','hitMultiplierPct','perfectBonus'],
  nine_dart_century: ['bustBack','bustResetAfter'],
  shove_a_penny: ['marksPerBox','overflowRule','overflowBonus'],
  green_vs_red: ['finishSteps','tripleAdvance','wrongColorAdvance'],
  hi_score: ['scoreMultiplierPct','bullBonus','missPenalty'],
  knockback: ['collisionResetPct','bustBack','collisionScoreBonus'],
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

console.log('✅ Wave61 V15 — quatrième lot de finitions individuelles');
console.log('✅ TUG RUSH / REPLICAT / DOUBLE DOWN / 9 DART CENTURY');
console.log('✅ SHOVE A PENNY / GREEN VS RED / HI SCORE / KNOCKBACK');
