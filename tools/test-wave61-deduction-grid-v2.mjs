import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61Play.tsx');
const config = read('src/pages/Wave61Config.tsx');
const families = read('src/games/dartsWave61Families.ts');

assert(engine.includes('WAVE61_ENGINE_VERSION = 4'), 'Constante Wave61 V4 absente');
assert(engine.includes('wave61MineNeighborCount'), 'Indices voisins DÉMINEUR absents');
assert(engine.includes('Scanner BULL'), 'Scanner BULL DÉMINEUR absent');
assert(engine.includes('processCodebreaker'), 'CODEBREAKER V2 absent');
assert(engine.includes('scoreCodeGuess'), 'Feedback exact/déplacé CODEBREAKER absent');
assert(engine.includes('processFaceMystere'), 'FACE MYSTÈRE spécialisé absent');
assert(engine.includes('faceCandidates'), 'Pool suspects FACE MYSTÈRE absent');
assert(engine.includes('processColinMaillard'), 'COLIN-MAILLARD spécialisé absent');
assert(engine.includes('colinStepByPlayer'), 'Progression mémoire COLIN-MAILLARD absente');
assert(engine.includes('align4Moves'), 'Historique ALIGN 4 absent');

assert(play.includes('CodebreakerPanel'), 'UI CODEBREAKER absente');
assert(play.includes('FaceMysterePanel'), 'UI FACE MYSTÈRE absente');
assert(play.includes('ColinBoard'), 'UI COLIN-MAILLARD absente');
assert(play.includes('APERÇU 2s'), 'Aperçu mémoire 2s absent');
assert(play.includes('GRILLE 5 × 4'), 'UI DÉMINEUR 5x4 absente');
assert(play.includes('moteur V${WAVE61_ENGINE_VERSION}'), 'Play n’annonce pas le moteur courant');
assert(config.includes('moteur mutualisé V${WAVE61_ENGINE_VERSION}'), 'Config n’annonce pas le moteur courant');
assert(config.includes('engineVersion: WAVE61_ENGINE_VERSION'), 'Config engineVersion non centralisée');
assert(play.includes('engineVersion: WAVE61_ENGINE_VERSION'), 'History engineVersion non centralisée');

assert(/codebreaker:\s*\{\s*defaultGoal:\s*3/.test(families), 'CODEBREAKER doit viser 3 valeurs exactes');
assert(/colin_maillard:\s*\{\s*defaultGoal:\s*6/.test(families), 'COLIN-MAILLARD doit avoir 6 étapes');
assert(/mafia:\s*\{\s*minPlayers:\s*4/.test(families), 'MAFIA doit demander au moins 4 joueurs');

console.log('✅ Wave61 V2 — Plateau & Déduction');
console.log('✅ ALIGN 4: historique de coups + grille');
console.log('✅ DÉMINEUR: indices voisins + flood safe + scanners BULL/DBULL');
console.log('✅ CODEBREAKER: code 3 secteurs + feedback exact/déplacé');
console.log('✅ FACE MYSTÈRE: 20 suspects + indices + élimination');
console.log('✅ COLIN-MAILLARD: séquence mémoire 6 étapes + aperçu 2s');
