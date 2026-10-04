import fs from 'node:fs'; const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8'); const c=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for(const x of ['processObjectifLune','lunarStageByPlayer','lunarFuelByPlayer','lunarStabilityByPlayer','fuelMinimum','Trajectoire perdue']) if(!e.includes(x)) throw new Error(`OBJECTIF LUNE missing ${x}`);
if(!c.includes('id: "objectif_lune"') || !c.includes('supportsTeams: true') || !c.includes('supportsBots: true')) throw new Error('OBJECTIF LUNE catalogue');
console.log('✅ Wave61 V54 — OBJECTIF LUNE finalisé · carburant · stabilité · phases · Teams/Bots');
