import fs from 'node:fs';
const engine=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts',import.meta.url),'utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(engine.includes('le_loup'), 'Contrat le-loup absent: le_loup');
ok(engine.includes('processLeLoup'), 'Contrat le-loup absent: processLeLoup');
ok(engine.includes('nextEnemy(state, playerId)'), 'Contrat le-loup absent: nextEnemy(state, playerId)');
ok(engine.includes('loupProtectedByPlayer'), 'Contrat le-loup absent: loupProtectedByPlayer');
ok(engine.includes('loupCaughtByPlayer'), 'Contrat le-loup absent: loupCaughtByPlayer');
ok(engine.includes('catchLives'), 'Contrat le-loup absent: catchLives');
ok(engine.includes('loupId = victim.id'), 'Contrat le-loup absent: loupId = victim.id');
console.log('✅ Wave61 V44 — le-loup');
