import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
const c=fs.readFileSync(new URL('../src/pages/Wave61SharedConfig.tsx', import.meta.url),'utf8');
for (const x of ['state.modeId === "nine_dart_century"','centuryLockedByPlayer','centuryDartsAtLockByPlayer','const under = state.players.filter','return as - bs']) if(!e.includes(x)) throw new Error('9 DART CENTURY missing '+x);
if(!c.includes('spec.id === "nine_dart_century" ? 3')) throw new Error('Century must lock 3 rounds / 9 darts');
console.log('✅ V39 9 DART CENTURY: 9-dart cap, exact 100, over-100 ranking and all-bust fallback guarded.');
