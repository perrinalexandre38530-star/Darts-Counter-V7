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
  shove_a_penny: ['marksPerBox','overflowRule','overflowBonus'],
  green_vs_red: ['matchFormat','contractRule','scoreModel','bullRule','penaltyModel'],
  hi_score: ['scoreMultiplierPct','missPenalty'],
  knockback: ['collisionResetPct','bustBack','collisionScoreBonus'],
};

for (const [id, keys] of Object.entries(cases)) {
  const cfg = read(`src/pages/wave61/modes/${id}Config.tsx`);
  const play = read(`src/pages/wave61/modes/${id}Play.tsx`);
  assert(cfg.includes('dedicatedOptions={DEDICATED_OPTIONS}'), `${id}: options dédiées absentes`);
  assert(play.includes('dedicatedPlayHint='), `${id}: hint Play absent`);
  for (const key of keys) {
    assert(cfg.includes(`key: "${key}"`), `${id}: option ${key} absente`);
    assert(engine.includes(key), `moteur: ${key} absent`);
    assert(sharedPlay.includes(key), `HUD Play: ${key} absent`);
  }
}


const centuryConfig = read('src/pages/wave61/modes/nine_dart_centuryConfig.tsx');
const centuryPlay = read('src/pages/wave61/modes/nine_dart_centuryPlay.tsx');
assert(centuryConfig.includes('key: "targetScore"') && centuryConfig.includes('defaultValue: 100'), '9 DART CENTURY: objectif fixe 100 absent');
assert(centuryPlay.includes('dedicatedPlayHint='), '9 DART CENTURY: hint Play absent');
assert(engine.includes('centuryLockedByPlayer') && engine.includes('centuryBustsByPlayer') && engine.includes('state.modeId === "nine_dart_century"'), '9 DART CENTURY: verrouillage / bust moteur absents');
assert(sharedPlay.includes('CenturyPanel') && sharedPlay.includes('centuryBustsByPlayer'), '9 DART CENTURY: suivi HUD absent');

const greenConfig = read('src/pages/wave61/modes/green_vs_redConfig.tsx');
assert(greenConfig.includes('key: "transferMissPoints"') && engine.includes('transferMissPoints'), 'GREEN VS RED: pénalité MISS transfert absente');
const hiScoreConfig = read('src/pages/wave61/modes/hi_scoreConfig.tsx');
assert(hiScoreConfig.includes('key: "fatBull"') && engine.includes('"fatBull"'), 'HI SCORE: Fat Bull absent');

console.log('✅ Wave61 V15 — quatrième lot de finitions individuelles');
console.log('✅ TUG RUSH / REPLICAT / DOUBLE DOWN / 9 DART CENTURY');
console.log('✅ SHOVE A PENNY / GREEN VS RED / HI SCORE / KNOCKBACK');
