import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61SharedPlay.tsx');
const config = read('src/pages/Wave61SharedConfig.tsx');
const families = read('src/games/dartsWave61Families.ts');

assert(/WAVE61_ENGINE_VERSION = (?:[4-9]|[1-9][0-9]+)/.test(engine), 'Wave61 doit être au moins V4');
assert(engine.includes('sameReplicatNumber'), 'REPLICAT difficulté absente');
assert(engine.includes('progressDelta'), 'REPLICAT progression corrigée absente');
assert(engine.includes('doubleDownContractMatches'), 'DOUBLE DOWN contrats V3 absents');
assert(engine.includes('centuryBustsByPlayer'), '9 DART CENTURY bust tracking absent');
assert(engine.includes('processShoveAPenny'), 'SHOVE A PENNY spécialisé absent');
assert(engine.includes('shoveMarksByPlayer'), 'Table de marques SHOVE A PENNY absente');
assert(engine.includes('processGreenVsRed'), 'GREEN VS RED spécialisé absent');
assert(engine.includes('greenRedColorByPlayer'), 'Couleurs GREEN VS RED absentes');
assert(engine.includes('state.modeId === "hi_score"'), 'HI SCORE spécialisé absent');
assert(engine.includes('processSniper'), 'SNIPER contrats spécialisés absents');
assert(engine.includes('sniperContracts'), 'SNIPER missions absentes');
assert(engine.includes('processLuciole'), 'LUCIOLE mémoire flash absente');
assert(engine.includes('wave61LucioleTarget'), 'LUCIOLE target helper absent');
assert(engine.includes('processGoldenDart'), 'GOLDEN DART cible secrète absente');
assert(engine.includes('goldenClues'), 'GOLDEN DART indices absents');
assert(engine.includes('bestTeam'), 'Classement équipes fin de rounds absent');

assert(play.includes('ReplicatPanel'), 'UI REPLICAT absente');
assert(play.includes('DoubleDownPanel'), 'UI DOUBLE DOWN absente');
assert(play.includes('CenturyPanel'), 'UI 9 DART CENTURY absente');
assert(play.includes('ShovePennyPanel'), 'UI SHOVE A PENNY absente');
assert(play.includes('GreenRedPanel'), 'UI GREEN VS RED absente');
assert(play.includes('SniperPanel'), 'UI SNIPER absente');
assert(play.includes('LuciolePanel'), 'UI LUCIOLE absente');
assert(play.includes('GoldenDartPanel'), 'UI GOLDEN DART absente');
assert(play.includes('1600'), 'Flash 1,6 s LUCIOLE absent');
assert(play.includes('moteur V${WAVE61_ENGINE_VERSION}'), 'Play n’annonce pas le moteur courant');
assert(config.includes('moteur mutualisé V${WAVE61_ENGINE_VERSION}'), 'Config n’annonce pas le moteur courant');
assert(config.includes('engineVersion: WAVE61_ENGINE_VERSION'), 'Config engineVersion non centralisée');
assert(play.includes('engineVersion: WAVE61_ENGINE_VERSION'), 'History engineVersion non centralisée');

assert(/shove_a_penny:\s*\{[^}]*defaultRounds:\s*15,\s*defaultGoal:\s*21/.test(families), 'SHOVE A PENNY doit viser 21 marques');
assert(/green_vs_red:\s*\{[^}]*defaultRounds:\s*14,\s*defaultGoal:\s*10/.test(families), 'GREEN VS RED doit viser 10 étapes');
assert(/nine_dart_century:\s*\{\s*defaultRounds:\s*3,\s*defaultGoal:\s*100/.test(families), '9 DART CENTURY doit rester 3 rounds / 100');
assert(/replicat:\s*\{\s*defaultGoal:\s*9/.test(families), 'REPLICAT doit viser 9 copies');
assert(/sniper:\s*\{\s*defaultGoal:\s*12/.test(families), 'SNIPER doit viser 12 missions');
assert(/luciole:\s*\{\s*defaultGoal:\s*10/.test(families), 'LUCIOLE doit viser 10 flashes');
assert(/golden_dart:\s*\{\s*defaultGoal:\s*7/.test(families), 'GOLDEN DART doit viser 7 cibles dorées');

console.log('✅ Wave61 V3 — Score & Précision');
console.log('✅ REPLICAT: difficulté + progression corrigée');
console.log('✅ DOUBLE DOWN / 9 DART CENTURY / HI SCORE');
console.log('✅ SHOVE A PENNY / GREEN VS RED');
console.log('✅ SNIPER / LUCIOLE / GOLDEN DART');
console.log('✅ UI signature + bots + classement équipes');
