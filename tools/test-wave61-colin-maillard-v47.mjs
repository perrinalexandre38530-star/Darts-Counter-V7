import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts',import.meta.url),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(engine.includes('colin_maillard'), 'Contrat colin-maillard absent: colin_maillard');
ok(engine.includes('processColinMaillard'), 'Contrat colin-maillard absent: processColinMaillard');
ok(engine.includes('colinSequence'), 'Contrat colin-maillard absent: colinSequence');
ok(engine.includes('colinStepByPlayer'), 'Contrat colin-maillard absent: colinStepByPlayer');
ok(engine.includes('sequenceLength'), 'Contrat colin-maillard absent: sequenceLength');
ok(engine.includes('finishWith(state, playerId)'), 'Contrat colin-maillard absent: finishWith(state, playerId)');
console.log('✅ Wave61 V47 — colin-maillard');
