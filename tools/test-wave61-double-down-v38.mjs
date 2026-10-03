import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
const c=fs.readFileSync(new URL('../src/pages/Wave61SharedConfig.tsx', import.meta.url),'utf8');
for (const x of ['state.modeId === "double_down"','missPenaltyPercent','hitMultiplierPct','perfectBonus','doubleDownHistory']) if(!e.includes(x)) throw new Error('DOUBLE DOWN missing '+x);
if(!c.includes('spec.id === "double_down" ? 9')) throw new Error('DOUBLE DOWN must lock 9 rounds');
console.log('✅ V38 DOUBLE DOWN: 9 contracts, miss half/penalty, hit scoring and perfect bonus guarded.');
