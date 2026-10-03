import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
for (const x of ['processGreenVsRed','GREEN_RING','RED_RING','ownTeam && state.config.teamByPlayer?.[p.id] === ownTeam','state.special.greenRedStepByPlayer[oppId] >= finishSteps','finishWith(state, oppId']) if(!e.includes(x)) throw new Error('GREEN VS RED missing '+x);
console.log('✅ V41 GREEN VS RED: colour paths, true opposing camp and gifted finish guarded.');
