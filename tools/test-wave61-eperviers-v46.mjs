import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts',import.meta.url),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(engine.includes('eperviers'), 'Contrat eperviers absent: eperviers');
ok(engine.includes('processEperviers'), 'Contrat eperviers absent: processEperviers');
ok(engine.includes('teamByPlayer[id] === teamIds[0] ? "HAWK" : "RUNNER"'), 'Contrat eperviers absent: teamByPlayer[id] === teamIds[0] ? "HAWK" : "RUNNER"');
ok(engine.includes('catchThreshold'), 'Contrat eperviers absent: catchThreshold');
ok(engine.includes('crossingGoal'), 'Contrat eperviers absent: crossingGoal');
ok(engine.includes('const hawk = state.players.find'), 'Contrat eperviers absent: const hawk = state.players.find');
console.log('✅ Wave61 V46 — eperviers');
