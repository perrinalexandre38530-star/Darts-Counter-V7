import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const sharedPlay = read('src/pages/Wave61SharedPlay.tsx');
const panels = read('src/pages/wave61/Wave61FablePartyPanels.tsx');
const catalog = read('src/games/dartsWave61.ts');

assert(engine.includes('WAVE61_ENGINE_VERSION = 18'), 'Wave61 V18 moteur attendu');
for (const id of ['mistigri','radin','corbeau_renard','darts_impossible']) {
  assert(catalog.includes(`id: "${id}"`), `${id}: absent du catalogue`);
  assert(fs.existsSync(`src/pages/wave61/modes/${id}Config.tsx`), `${id}: Config absente`);
  assert(fs.existsSync(`src/pages/wave61/modes/${id}Play.tsx`), `${id}: Play absent`);
}

const expected = {
  mistigri: ['dangerThreshold','dangerPerMiss','bullShield'],
  radin: ['startWallet','targetWallet','missFee','bullRebate'],
  corbeau_renard: ['startingCheese','cheeseGoal','fableThreshold','bullGuard'],
  darts_impossible: ['missionCount','alarmGain','alarmThreshold','failBack','bullCooling'],
};
for (const [id, keys] of Object.entries(expected)) {
  const cfg = read(`src/pages/wave61/modes/${id}Config.tsx`);
  for (const key of keys) assert(cfg.includes(`key: "${key}"`), `${id}: option ${key} absente`);
  for (const key of keys) assert(engine.includes(`"${key}"`), `${id}: moteur ${key} absent`);
}

for (const token of ['processMistigri','processRadin','processCorbeauRenard','processDartsImpossible','mistigriHolderId','radinWalletByPlayer','fableCheeseByPlayer','impossibleAlarmByPlayer']) {
  assert(engine.includes(token), `moteur spécifique absent: ${token}`);
}
for (const token of ['MistigriPanel','RadinPanel','CorbeauRenardPanel','DartsImpossiblePanel']) {
  assert(sharedPlay.includes(token), `SharedPlay: ${token} non branché`);
  assert(panels.includes(`function ${token}`), `Panel absent: ${token}`);
}

console.log('✅ Wave61 V21 — MISTIGRI / RADIN / CORBEAU & RENARD / DARTS IMPOSSIBLE');
console.log('✅ Moteurs spécifiques + options dédiées + panneaux Play');
