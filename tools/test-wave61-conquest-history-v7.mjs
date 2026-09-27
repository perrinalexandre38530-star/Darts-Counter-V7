import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61SharedPlay.tsx');
const panels = read('src/pages/wave61/Wave61ConquestPanels.tsx');
const families = read('src/games/dartsWave61Families.ts');
const catalog = read('src/games/dartsWave61.ts');
assert(/WAVE61_ENGINE_VERSION = (?:[8-9]|[1-9][0-9]+)/.test(engine), 'Wave61 doit conserver V7 ou supérieur');
assert(engine.includes('CONQUEST_PROFILES'), 'Profils de conquête absents');
assert(engine.includes('processConquestMode'), 'Moteur de conquête absent');
assert(engine.includes('conquestOwnerByNode'), 'Propriétaires de territoires absents');
assert(engine.includes('conquestFortByNode'), 'Fortifications absentes');
assert(engine.includes('conquestResourceByPlayer'), 'Ressources de faction absentes');
assert(engine.includes('processChevalTroie'), 'Cheval de Troie spécialisé absent');
assert(engine.includes('trojanAlertByPlayer'), 'Alerte Cheval de Troie absente');
for (const id of ['vikings','black_flag','menhir_mayhem','attila','poseidon','cheval_de_troie','sabaudia_dauphine','galaxies']) assert(new RegExp(`\\b${id}:\\s*"conquest"`).test(families), `${id} n'est pas classé conquest`);
assert(catalog.includes('id: "galaxies", label: "GALAXIES"'), 'GALAXIES non corrigé');
for (const panel of ['VikingsPanel','BlackFlagPanel','MenhirMayhemPanel','AttilaPanel','PoseidonPanel','ChevalTroiePanel','SabaudiaDauphinePanel','GalaxiesPanel']) { assert(panels.includes(`function ${panel}`) || panels.includes(`export function ${panel}`), `${panel} absent`); assert(play.includes(`<${panel}`), `${panel} non rendu`); }
assert(play.includes('vikings:') && play.includes('galaxies:'), 'Règles V7 non conservées');
console.log('✅ Wave61 V7 — Conquête / Histoire / Territoire');
console.log('✅ VIKINGS / BLACK FLAG / MENHIR MAYHEM / ATTILA / POSÉIDON');
console.log('✅ CHEVAL DE TROIE / SABAUDIA & DAUPHINÉ / GALAXIES');
