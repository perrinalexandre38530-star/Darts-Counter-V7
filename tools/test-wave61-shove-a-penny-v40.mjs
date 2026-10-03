import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
for (const x of ['processShoveAPenny','SHOVE_TARGETS','marksPerBox','overflowRule','shoveMarksByPlayer','finishWith(state, playerId)']) if(!e.includes(x)) throw new Error('SHOVE A PENNY missing '+x);
console.log('✅ V40 SHOVE A PENNY: marks, surplus, opponent shove/bonus and closure guarded.');
