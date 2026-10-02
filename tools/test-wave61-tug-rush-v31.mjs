import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const config=read('src/pages/wave61/modes/tug_rushConfig.tsx');
const play=read('src/pages/wave61/modes/tug_rushPlay.tsx');
const panel=read('src/pages/wave61/Wave61RacePanels.tsx');
const catalog=read('src/games/dartsWave61.ts');
const families=read('src/games/dartsWave61Families.ts');
for (const token of [
  'modeId === "tug_rush"', 'tugTargetSequence', 'tugSideByPlayer', 'tugPosition',
  'tugContributionByPlayer', 'processTugRush', 'pullPowerPct', 'bullBoostPct',
  'slipPenalty', 'Math.abs(Number(state.special.tugPosition || 0))',
  'TUG RUSH is decided by the rope itself', 'position > 0 ? "A" : position < 0 ? "B" : null',
  'state.config.participantMode === "teams" ? winningSide : null'
]) assert(engine.includes(token), `TUG RUSH V31 moteur incomplet: ${token}`);
for (const token of ['pullPowerPct','slipPenalty','bullBoostPct']) assert(config.includes(token),`TUG RUSH option absente: ${token}`);
assert(play.includes('forcedModeId={WAVE61_MODE_ID}'),'TUG RUSH Play dédié absent');
assert(panel.includes('TUG RUSH · CAMP A') && panel.includes('CAMP B'),'TUG RUSH panneau corde absent');
assert(catalog.includes('id: "tug_rush"') && catalog.includes('supportsTeams: true') && catalog.includes('supportsBots: true'),'TUG RUSH catalogue incomplet');
assert(families.includes('tug_rush: { minPlayers: 2, defaultGoal: 60, defaultRounds: 15 }'),'TUG RUSH preset absent');
console.log('✅ Wave61 V31 — TUG RUSH finalisé individuellement');
console.log('✅ cible dynamique · traction S/D/T/BULL · recul · camps · Teams/Bots · fin par corde · tie-break centre');
