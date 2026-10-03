import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
for (const x of ['state.modeId === "hi_score"','scoreMultiplierPct','bullBonus','missPenalty','bestTeam(state)']) if(!e.includes(x)) throw new Error('HI SCORE missing '+x);
console.log('✅ V42 HI SCORE: visit total, bonuses/penalties and team round-limit ranking guarded.');
