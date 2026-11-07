import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const play = read('src/pages/Wave61SharedPlay.tsx');
const modeIds = ['black_vs_white','three_colors','la_suite','color_call','bim_bam_boum','saute_moutons','troupeau_en_danger','une_ptite_raclette'];
const wave = read('src/games/dartsWave61.ts');
const families = read('src/games/dartsWave61Families.ts');
for (const id of modeIds) {
  assert.match(wave, new RegExp(`id: "${id}"`), `${id} registered`);
  assert.match(families, new RegExp(`${id}:`), `${id} family`);
  assert.ok(play.includes(id), `${id} supported by shared play`);
}

// Preserve the complete BO/FT state and explicitly block BOT scheduling while paused.
for (const fragment of [
  'function Wave61SeriesIntermission(',
  'data-wave61-series-intermission="1"',
  'data-wave61-series-continue="1"',
  'data-wave61-series-undo="1"',
  'completedGameIndex',
  'nextGameIndex',
  'seriesIntermission: {',
  'seriesIntermissionUndo: cloneWave61State(previous)',
  'state.special?.seriesIntermission',
  '!visitRecap && state.special?.seriesIntermission',
  'state.special?.seriesIntermissionUndo?.modeId === spec.id',
  'delete next.special.seriesIntermission;',
  'delete next.special.seriesIntermissionUndo;',
  'const persistedSeriesUndo',
  'const canUndo = undo.length > 0 || !!persistedSeriesUndo',
  'onUndo={canUndo ? doUndo : null}',
]) assert.ok(play.includes(fragment), `missing V182 contract: ${fragment}`);

// Every playable render branch must display the same modal (portrait, landscape and fallback).
assert.equal((play.match(/<Wave61SeriesIntermission /g) || []).length, 3, 'three play layouts wired');

// Winning visits must never become draft darts in the next leg after a History resume.
assert.ok(play.includes('record.resume.currentThrow = [];'));
assert.ok(play.includes('record.payload.currentThrow = [];'));
assert.ok(play.includes('record.resume.multiplier = 1;'));
assert.ok(play.includes('record.payload.multiplier = 1;'));
for (const expression of ['persist(committed, true);', 'persist(restored, true);', 'persist(next, true);'])
  assert.ok(play.includes(expression), `${expression} must clear saved draft`);

// Validate and BOT turn guards are both required: a modal alone cannot prevent bot actions.
assert.match(play, /if \(!currentThrow\.length[^\n]*state\.special\?\.seriesIntermission\) return;/);
assert.match(play, /if \(!activeIsBot[^\n]*state\.special\?\.seriesIntermission\) return;/);
assert.ok(play.includes('intermission: state?.special?.seriesIntermission'));

// The same original match ID must be retained across consecutive legs.
assert.ok(play.includes('fresh.startedAt = previous.startedAt;'));
assert.ok(play.includes('fresh.visits = [...(next.visits || [])];'));
console.log('✅ V182 — 8 modes: intermission BO/FT, reprise/UNDO après reload, BOT bloqué, brouillon History nettoyé.');
