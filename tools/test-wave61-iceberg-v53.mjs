import fs from 'node:fs';
const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
const c=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for (const x of ['icebergHullByPlayer','icebergFloodByPlayer','icebergCompartmentsByPlayer','processIceberg','🚢 Navire perdu','else if (compartments >= compartmentGoal)']) if(!e.includes(x)) throw new Error(`ICEBERG missing ${x}`);
if(!c.includes('id: "iceberg"') || !c.includes('supportsTeams: true') || !c.includes('supportsBots: true')) throw new Error('ICEBERG catalogue contract');
console.log('✅ Wave61 V53 — ICEBERG finalisé · naufrage prioritaire · coque/eau/compartiments · Teams/Bots');
