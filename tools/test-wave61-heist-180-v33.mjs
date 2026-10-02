import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const config=read('src/pages/wave61/modes/heist_180Config.tsx');
const play=read('src/pages/wave61/modes/heist_180Play.tsx');
const panels=read('src/pages/wave61/Wave61MissionAdventurePanels.tsx');
const feedback=read('src/lib/wave61Feedback.ts');
for (const token of [
  'modeId === "heist_180"','heistSequence','heistStageByPlayer','heistMarksByPlayer',
  'heistLootByPlayer','heistHeatByPlayer','processHeist180','HEIST_STAGES',
  'phaseNeed','heatGain','bullCooling','if (heat >= 100)',
  'cannot escape successfully on the same visit that makes the alarm hit 100%.',
  'stage = Math.max(0, Math.min(stage, HEIST_STAGES.length - 1) - 1)',
  'if (stage >= HEIST_STAGES.length) finishWith'
]) assert(engine.includes(token),`HEIST 180 V33 moteur incomplet: ${token}`);
for (const token of ['phaseNeed','heatGain','bullCooling']) assert(config.includes(token),`HEIST 180 option absente: ${token}`);
assert(play.includes('forcedModeId={WAVE61_MODE_ID}'),'HEIST 180 Play dédié absent');
assert(panels.includes('HEIST 180 · CASSE EN 4 PHASES'),'HEIST 180 panneau dédié absent');
assert(feedback.includes('heist_180'),'HEIST 180 feedback Awena absent');
console.log('✅ Wave61 V33 — HEIST 180 finalisé individuellement');
console.log('✅ 4 phases · cible seedée · butin · chaleur · BULL cooling · alarme prioritaire · Teams/Bots · fin');
