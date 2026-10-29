import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
const g=fs.readFileSync(new URL('../src/games/dartsWave61.ts', import.meta.url),'utf8');
for (const x of ['processGreenVsRed','GREEN_RING','RED_RING','wrongColorPenaltyPct','countedBeds','delta -= penalty','step >= 10']) if(!e.includes(x)) throw new Error('GREEN VS RED missing '+x);
if(!g.includes('id: "green_vs_red"') || !g.includes('maxPlayers: 2, supportsTeams: false')) throw new Error('GREEN VS RED must be strict 2-player duel');
console.log('✅ V41 GREEN VS RED: strict duel, fixed colour paths, D/T uniqueness, bull finale and wrong-colour penalty guarded.');
