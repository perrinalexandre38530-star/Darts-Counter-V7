import fs from 'node:fs'; const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8'); const c=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for(const x of ['processJackpot','evaluateJackpotSpin','jackpotPot','jackpotWinsByPlayer','jackpotJackpotsByPlayer','JACKPOT 777','potGrowth']) if(!e.includes(x)) throw new Error(`JACKPOT missing ${x}`);
if(!c.includes('id: "jackpot"') || !c.includes('supportsTeams: false') || !c.includes('supportsBots: true')) throw new Error('JACKPOT catalogue');
console.log('✅ Wave61 V57 — JACKPOT finalisé · symboles · pot progressif · 777 · payouts · Bots');
