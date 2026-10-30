import fs from 'node:fs';
const e=fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url),'utf8');
const g=fs.readFileSync(new URL('../src/games/dartsWave61.ts', import.meta.url),'utf8');
const c=fs.readFileSync(new URL('../src/pages/wave61/modes/green_vs_redConfig.tsx', import.meta.url),'utf8');
const p=fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx', import.meta.url),'utf8');
const h=fs.readFileSync(new URL('../src/pages/HistoryPage.tsx', import.meta.url),'utf8');
for (const x of [
  'processGreenVsRed','GREEN_RING','RED_RING','wrongColorPenaltyPct','countedBeds',
  'greenRedColorAssignments','multi_random','greenRedPenaltyByPlayer','greenRedBullBonusByPlayer',
  'bullRule === "color_lock"','bullRule === "color_bonus"'
]) if(!e.includes(x)) throw new Error('GREEN VS RED engine missing '+x);
if(!g.includes('id: "green_vs_red"') || !g.includes('maxPlayers: 10, supportsTeams: true')) throw new Error('GREEN VS RED formats 2/4/6/8/10 not enabled');
for (const x of ['matchFormat','DUEL · 2 joueurs','TEAM · 4 / 6 / 8 joueurs','MULTI ALÉATOIRE','BULL DE COULEUR','BULL BONUS','greenBullBonus','redBullBonus']) if(!c.includes(x)) throw new Error('GREEN VS RED config missing '+x);
for (const x of ['data-green-red-duel-scoreboard="1"','TEAM VERTE','TEAM ROUGE','data-green-red-keypad="1"','currentThrow: currentThrow.slice(0, 3)','multiplier']) if(!p.includes(x)) throw new Error('GREEN VS RED UI/resume missing '+x);
for (const x of ['WAVE61 : reprise générique','safeGo(["wave61_play"]','snapshot?.mode === "wave61"']) if(!h.includes(x)) throw new Error('History Wave61 resume missing '+x);
console.log('✅ V41 GREEN VS RED: duel/team/multi, bull variants, scoreboard, stats hooks and exact Wave61 history resume guarded.');
