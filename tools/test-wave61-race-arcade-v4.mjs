import fs from 'node:fs';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61Play.tsx');
const panels = read('src/pages/wave61/Wave61RacePanels.tsx');
const config = read('src/pages/Wave61Config.tsx');
const families = read('src/games/dartsWave61Families.ts');

assert(engine.includes('WAVE61_ENGINE_VERSION = 4'), 'Wave61 V4 absent');
assert(engine.includes('processTugRush'), 'TUG RUSH spécialisé absent');
assert(engine.includes('tugPosition'), 'Jauge TUG RUSH absente');
assert(engine.includes('processSoleil'), '1,2,3 SOLEIL spécialisé absent');
assert(engine.includes('soleilPhase'), 'Phases GO/STOP absentes');
assert(engine.includes('processChatSouris'), 'CHAT & SOURIS spécialisé absent');
assert(engine.includes('chatSourisCaughtByPlayer'), 'Capture CHAT & SOURIS absente');
assert(engine.includes('processMazeChase'), 'MAZE CHASE spécialisé absent');
assert(engine.includes('mazeGhostByPlayer'), 'Poursuivant MAZE CHASE absent');
assert(engine.includes('processChienChat'), 'CHIEN & CHAT spécialisé absent');
assert(engine.includes('processRollerCoaster'), 'ROLLER COASTER spécialisé absent');
assert(engine.includes('rollerSpeedByPlayer'), 'Vitesse ROLLER COASTER absente');
assert(engine.includes('processAthletisme'), 'ATHLÉTISME spécialisé absent');
assert(engine.includes('ATHLETICS_DISCIPLINES'), 'Disciplines ATHLÉTISME absentes');
assert(engine.includes('processChuteLibre'), 'CHUTE LIBRE spécialisé absent');
assert(engine.includes('freefallAltitudeByPlayer'), 'Altitude CHUTE LIBRE absente');
assert(engine.includes('processTyrolien'), 'TYROLIEN spécialisé absent');
assert(engine.includes('tyrolienSpeedByPlayer'), 'Vitesse TYROLIEN absente');
assert(engine.includes('processSautCorde'), 'SAUT À LA CORDE spécialisé absent');
assert(engine.includes('ropeComboByPlayer'), 'Combo SAUT À LA CORDE absent');

for (const panel of ['TugRushPanel','SoleilPanel','ChatSourisPanel','MazeChasePanel','ChienChatPanel','RollerCoasterPanel','AthleticsPanel','FreefallPanel','TyrolienPanel','JumpRopePanel']) {
  assert(panels.includes(`function ${panel}`) || panels.includes(`export function ${panel}`), `UI ${panel} absente`);
  assert(play.includes(`<${panel}`), `Wave61Play ne rend pas ${panel}`);
}

assert(config.includes('spec.id === "athletisme" ? 6'), 'ATHLÉTISME doit verrouiller 6 rounds');
assert(/tug_rush:\s*\{[^}]*minPlayers:\s*2[^}]*defaultGoal:\s*60/.test(families), 'TUG RUSH doit être un duel et viser 60');
assert(/maze_chase:\s*\{\s*defaultGoal:\s*20/.test(families), 'MAZE CHASE doit avoir 20 cases');
assert(/athletisme:\s*\{\s*defaultGoal:\s*0,\s*defaultRounds:\s*6/.test(families), 'ATHLÉTISME doit avoir 6 épreuves');
assert(/chute_libre:\s*\{\s*defaultGoal:\s*0,\s*defaultRounds:\s*12/.test(families), 'CHUTE LIBRE doit utiliser atterrissage/crash plutôt qu’un goal moteur');
assert(play.includes('Course / Arcade / Performance'), 'Texte de passe V4 absent');
assert(config.includes('WAVE61_ENGINE_VERSION'), 'Config ne consomme pas la version moteur');
assert(play.includes('WAVE61_ENGINE_VERSION'), 'Play ne consomme pas la version moteur');

console.log('✅ Wave61 V4 — Course / Arcade / Performance');
console.log('✅ TUG RUSH / 1,2,3 SOLEIL / CHAT & SOURIS');
console.log('✅ MAZE CHASE / CHIEN & CHAT / ROLLER COASTER');
console.log('✅ ATHLÉTISME / CHUTE LIBRE / TYROLIEN / SAUT À LA CORDE');
console.log('✅ Panneaux dédiés + version moteur centralisée');
