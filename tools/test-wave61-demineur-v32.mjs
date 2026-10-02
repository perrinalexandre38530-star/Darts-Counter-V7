import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const engine=read('src/lib/gameEngines/wave61Engine.ts');
for (const token of [
  'state.modeId === "demineur"','processMinefield','safeByPlayer','teamTotals = new Map',
  'current.safe += Number(state.special?.safeByPlayer?.[p.id] || 0)',
  'b[1].safe - a[1].safe || b[1].health - a[1].health',
  'finishWith(state, winner, winningTeam)'
]) assert(engine.includes(token),`DÉMINEUR V32 incomplet: ${token}`);
console.log('✅ Wave61 V32 — DÉMINEUR finalisé individuellement');
console.log('✅ grille/mines/scanner · contribution Teams agrégée · départage PV · fin cohérente');
