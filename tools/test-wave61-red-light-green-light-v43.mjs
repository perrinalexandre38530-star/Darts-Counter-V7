import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts',import.meta.url),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(engine.includes('un_deux_trois_soleil'), 'Contrat red-light-green-light absent: un_deux_trois_soleil');
ok(engine.includes('processSoleil'), 'Contrat red-light-green-light absent: processSoleil');
ok(engine.includes('soleilPhase'), 'Contrat red-light-green-light absent: soleilPhase');
ok(engine.includes('stopPenalty'), 'Contrat red-light-green-light absent: stopPenalty');
ok(engine.includes('freezeBonus'), 'Contrat red-light-green-light absent: freezeBonus');
ok(engine.includes('soleilFallsByPlayer'), 'Contrat red-light-green-light absent: soleilFallsByPlayer');
ok(engine.includes('finishWith(state, playerId)'), 'Contrat red-light-green-light absent: finishWith(state, playerId)');
console.log('✅ Wave61 V43 — red-light-green-light');
