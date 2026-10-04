import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts',import.meta.url),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(engine.includes('chat_souris'), 'Contrat chat-souris absent: chat_souris');
ok(engine.includes('processChatSouris'), 'Contrat chat-souris absent: processChatSouris');
ok(engine.includes('teamByPlayer[id] === teamIds[0] ? "CAT" : "MOUSE"'), 'Contrat chat-souris absent: teamByPlayer[id] === teamIds[0] ? "CAT" : "MOUSE"');
ok(engine.includes('chatSourisCaughtByPlayer'), 'Contrat chat-souris absent: chatSourisCaughtByPlayer');
ok(engine.includes('finishWith(state, playerId)'), 'Contrat chat-souris absent: finishWith(state, playerId)');
console.log('✅ Wave61 V45 — chat-souris');
