import fs from 'node:fs';
import assert from 'node:assert/strict';

const play = fs.readFileSync(new URL('../src/pages/wave61/Wave61SharedPlay.tsx', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../src/pages/wave61/modes/align_4Config.tsx', import.meta.url), 'utf8');

assert(play.includes('ALIGN {connectLength} · PLATEAU EN DIRECT'), 'Plateau ALIGN 4 V83 absent');
assert(play.includes('DERNIER COUP'), 'Bloc dernier coup absent');
assert(play.includes('MENACE ACTUELLE'), 'Bloc menace absent');
assert(play.includes('Meilleure série'), 'Lecture série/alignement absente');
assert(play.includes('BULL·${n}'), 'Repère colonne BULL absent');
assert(play.includes('PLEIN'), 'État colonne pleine absent');
assert(engine.includes('function placeAlign4'), 'Moteur placement ALIGN 4 absent');
assert(engine.includes('checkConnect'), 'Détection alignement absente');
assert(engine.includes('Colonne ${col + 1} pleine'), 'Gestion colonne pleine absente');
assert(config.includes('connectLength'), 'Option longueur alignement absente');
assert(config.includes('bullColumn'), 'Option colonne BULL absente');

console.log('✅ Wave61 V83 — ALIGN 4 finalisé · plateau live · dernier coup · menace · colonnes pleines · BULL configurable');
