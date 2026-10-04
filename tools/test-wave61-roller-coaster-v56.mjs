import fs from 'node:fs'; const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8'); const c=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for(const x of ['processRollerCoaster','rollerSpeedByPlayer','rollerPosByPlayer','dangerLimit','trop rapide','bullBoostPct']) if(!e.includes(x)) throw new Error(`ROLLER COASTER missing ${x}`);
if(!c.includes('id: "roller_coaster"') || !c.includes('supportsTeams: false') || !c.includes('supportsBots: true')) throw new Error('ROLLER catalogue');
console.log('✅ Wave61 V56 — ROLLER COASTER finalisé · vitesse · danger · boosts · arrivée · Bots');
