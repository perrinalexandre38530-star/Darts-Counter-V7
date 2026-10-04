import fs from 'node:fs'; const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8'); const c=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for(const x of ['processGoldenDart','goldenTargets','goldenClues','goldenHistory','wave61GoldenTarget','une seule cible dorée peut être trouvée par volée']) if(!e.includes(x)) throw new Error(`GOLDEN DART missing ${x}`);
if(!c.includes('id: "golden_dart"') || !c.includes('supportsTeams: false') || !c.includes('supportsBots: true')) throw new Error('GOLDEN DART catalogue');
console.log('✅ Wave61 V55 — GOLDEN DART finalisé · cible secrète · indices · bonus S/D/T · Bots');
