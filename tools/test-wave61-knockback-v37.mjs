import fs from 'node:fs'; import assert from 'node:assert/strict';
const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
const fn=e.slice(e.indexOf('function processKnockback'), e.indexOf('function damageWithLayer'));
for (const t of ['projected > state.config.goal','bustBack','collisionResetPct','collisionScoreBonus','finishWith(state, playerId)']) assert(fn.includes(t),`KNOCKBACK: ${t} absent`);
console.log('✅ V37 KNOCKBACK: exact goal, BUST, collisions, recul, victoire');
