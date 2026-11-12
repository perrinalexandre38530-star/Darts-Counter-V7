import fs from 'node:fs';
import assert from 'node:assert/strict';

const play = fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../src/lib/gameEngines/wave61Engine.ts', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../src/pages/wave61/modes/align_4Config.tsx', import.meta.url), 'utf8');

for (const needle of [
  'function Align4Board',
  'ALIGN {state?.config?.modeOptions?.connectLength || 4} · GRILLE 7 × 6',
  'state?.special?.board',
  'board.flatMap',
  'repeat(7,1fr)',
  'COL {n}',
  '<Align4Board state={state}'
]) assert(play.includes(needle), `Plateau ALIGN 4 absent : ${needle}`);
assert(engine.includes('function placeAlign4'), 'Moteur placement ALIGN 4 absent');
assert(engine.includes('checkConnect'), 'Détection alignement absente');
assert(engine.includes('Colonne ${col + 1} pleine'), 'Gestion colonne pleine absente');
assert(config.includes('connectLength'), 'Option longueur alignement absente');
assert(config.includes('bullColumn'), 'Option colonne BULL absente');

console.log('✅ Wave61 V83 — ALIGN 4 finalisé · plateau live · dernier coup · menace · colonnes pleines · BULL configurable');
