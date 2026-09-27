import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/wave61/Wave61SharedPlay.tsx');
const panels = read('src/pages/wave61/Wave61SurvivalCombatPanels.tsx');
for (const fn of ['processHotPotato','processZombieSiege','processLeLoup','processEperviers','processBallonPrisonnier','processIceberg','processJurassic','processApocalypse','processKnockback','processSpartacus','processCosmoKnights']) assert(engine.includes(fn), `${fn} absent`);
for (const panel of ['HotPotatoPanel','ZombieSiegePanel','LoupPanel','EperviersPanel','DodgeballPanel','IcebergPanel','JurassicPanel','ApocalypsePanel','KnockbackPanel','SpartacusPanel','CosmoKnightsPanel']) { assert(panels.includes(`function ${panel}`) || panels.includes(`export function ${panel}`), `${panel} absent`); assert(play.includes(`<${panel}`), `${panel} non rendu`); }
console.log('✅ Wave61 V5 — Survie / Combat conservé');
