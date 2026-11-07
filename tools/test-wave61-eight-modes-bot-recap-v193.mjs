import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// V193 release gate — the 8 new modes use the same Play contract in portrait
// and landscape, including History-backed BOT recap acknowledgements.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const play = fs.readFileSync(path.join(root, 'src/pages/Wave61SharedPlay.tsx'), 'utf8');
const families = fs.readFileSync(path.join(root, 'src/games/dartsWave61Families.ts'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/games/dartsWave61.ts'), 'utf8');
const ids = [
  'black_vs_white', 'three_colors', 'la_suite', 'color_call',
  'bim_bam_boum', 'saute_moutons', 'troupeau_en_danger', 'une_ptite_raclette',
];

for (const id of ids) {
  assert.ok(catalog.includes(`id: "${id}"`), `${id}: registered game`);
  assert.ok(families.includes(`${id}:`), `${id}: family preset`);
  const routeList = play.match(/const classicFiveMode = \[([^\]]+)\]\.includes\(spec\.id\);/)?.[1] || '';
  assert.ok(routeList.includes(`"${id}"`), `${id}: fixed-keypad modern Play in portrait + landscape`);
  const seriesList = play.match(/function isFinishedColorVariant\([^\n]+/)?.[0] || '';
  assert.ok(seriesList.includes(`"${id}"`) || (id === 'black_vs_white' && play.includes('id === "black_vs_white"')), `${id}: full variant series/recap KPI contract`);
}

for (const contract of [
  'data-variant-live-stack={spec.id}',
  '<VariantPerformancePanel state={state} modeId={spec.id} accent={accent} />',
  '<Wave61SeriesIntermission',
  'seriesIntermissionUndo: cloneWave61State(previous)',
  'pendingBotVisitRecap: nextVisitRecap',
  'setVisitRecap(nextVisitRecap);',
  'const pending = state?.special?.pendingBotVisitRecap;',
  'String(pending.visitId) === String(lastVisit?.id || "")',
  'state.phase === "playing" && pending?.isBot === true',
  'if (nextVisitRecap.isBot && committed.phase === "playing")',
  'const closeVisitRecap = () => {',
  'delete acknowledged.special.pendingBotVisitRecap;',
  'persist(acknowledged, true);',
  'if (state.special?.pendingBotVisitRecap) return;',
  'historyWriteQueueRef.current = historyWriteQueueRef.current',
  '.then(() => History.upsert(record))',
  '}, [currentThrow, multiplier, state, persist]);',
]) {
  assert.ok(play.includes(contract), `V193: missing ${contract}`);
}

assert.equal((play.match(/onClose=\{closeVisitRecap\}/g) || []).length, 2,
  'BOT acknowledgement is wired in classic and landscape layouts');
assert.ok(play.includes('!manualContinue ? <button type="button" aria-label="Fermer le récapitulatif"'),
  'BOT recap cannot bypass CONTINUER with the close cross');
assert.ok(play.includes('data-wave61-bot-recap-continue="1"'),
  'BOT recap has an explicit CONTINUER button');
assert.ok(play.includes('if (!visitRecap || visitRecap.isBot) return;'),
  'Only human recaps may auto-dismiss');
assert.ok(play.includes('state.special?.seriesIntermission || state.special?.pendingBotVisitRecap') === false,
  'BOT and validation guards are expressed explicitly for prior test compatibility');
console.log('✅ V193 — 8 modes: fixed keypad & situational KPI panels; BOT recap saved/restored and explicitly acknowledged; History checkpoints serialized.');
