import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61SharedPlay.tsx');
const panels = read('src/pages/wave61/Wave61MissionAdventurePanels.tsx');
for (const fn of ['processHeist180','processEscapeGame','processObjectifLune','processHollywood','processMaya','processPyramides','processDracoSpheres','processMythologie','processJardinier','processMicroscopia','processDisjoncte','processPetitBac']) assert(engine.includes(fn), `${fn} absent`);
for (const panel of ['Heist180Panel','EscapeGamePanel','ObjectifLunePanel','HollywoodPanel','MayaPanel','PyramidesPanel','DracoSpheresPanel','MythologiePanel','JardinierPanel','MicroscopiaPanel','DisjonctePanel','PetitBacPanel']) { assert(panels.includes(`function ${panel}`) || panels.includes(`export function ${panel}`), `${panel} absent`); assert(play.includes(`<${panel}`), `${panel} non rendu`); }
console.log('✅ Wave61 V6 — Mission / Aventure conservé');
