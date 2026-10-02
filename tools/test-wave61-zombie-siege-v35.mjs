import fs from 'node:fs'; import assert from 'node:assert/strict';
const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
const fn=e.slice(e.indexOf('function processZombieSiege'), e.indexOf('function processLeLoup'));
for (const t of ['zombieRoleByPlayer','zombieInfectionByPlayer','zombieBarricadeByPlayer','infectionPowerPct','barricadePowerPct','curePowerPct']) assert(fn.includes(t),`ZOMBIE SIEGE: ${t} absent`);
assert(fn.includes('finishWith(state, zombie.id'),'ZOMBIE SIEGE: victoire horde absente');
console.log('✅ V35 ZOMBIE SIEGE: rôles, infection, barricade, cure, victoire');
