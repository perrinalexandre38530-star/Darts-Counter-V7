import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61SharedPlay.tsx');
const config = read('src/pages/Wave61SharedConfig.tsx');
const panels = read('src/pages/wave61/Wave61AscentPanels.tsx');
const families = read('src/games/dartsWave61Families.ts');
assert(/WAVE61_ENGINE_VERSION = (?:9|[1-9][0-9]+)/.test(engine), 'Wave61 doit conserver V8 ou supérieur');
assert(engine.includes('processAscentMode'), 'Moteur Ascension absent');
assert(engine.includes('ascentAltitudeByPlayer'), 'Altitude Ascension absente');
assert(engine.includes('ascentFatigueByPlayer'), 'Fatigue Ascension absente');
assert(engine.includes('ascentOxygenByPlayer'), 'Oxygène Ascension absent');
assert(engine.includes('ascentAcclimationByPlayer'), 'Acclimatation Ascension absente');
assert(engine.includes('summit14PeakByPlayer'), 'Progression Summit 14 absente');
assert(engine.includes('SUMMIT_14_PEAKS'), 'Liste des 14 sommets absente');
for (const id of ['mont_blanc','everest','summit_14']) assert(new RegExp(`\\b${id}:\\s*"ascent"`).test(families), `${id} n'est pas classé ascent`);
for (const panel of ['MontBlancPanel','EverestPanel','Summit14Panel']) { assert(panels.includes(`export function ${panel}`), `${panel} absent`); assert(play.includes(`<${panel}`), `${panel} non rendu`); }
assert(config.includes('spec.id === "mont_blanc" ? 4809'), 'Objectif Mont Blanc non verrouillé');
assert(config.includes('spec.id === "everest" ? 8849'), 'Objectif Everest non verrouillé');
assert(config.includes('spec.id === "summit_14" ? 14'), 'Objectif Summit 14 non verrouillé');
assert(play.includes('Chaque mode dispose maintenant de son fichier Play dédié'), 'Texte architecture dédiée absent');
console.log('✅ Wave61 V8 — Ascension / Montagne');
console.log('✅ MONT BLANC / EVEREST / SUMMIT 14 spécialisés');
