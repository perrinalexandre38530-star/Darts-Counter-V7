import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

function loadTs(relative, deps) {
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', transpiled)(m, m.exports, name => {
    if (name in deps) return deps[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return m.exports;
}
const { buildTrainingSessionCards } = loadTs('src/training/profile/trainingSessionCards.ts', {
  './trainingDailyQueue': { trainingSessionDateKey: at => new Date(at).toISOString().slice(0, 10) },
  '../catalog/trainingExerciseCatalog': { TRAINING_EXERCISE_CATALOG: [
    { id: 't20', title: 'T20 — 10 impacts' },
    { id: 'd16', title: 'D16 — 8 impacts' },
  ] },
});
const time = n => new Date(`2026-11-06T${n}:00Z`).getTime();
const program = (id, endedAt, steps) => ({
  id, programId: 'day_plan', programTitle: 'Plan du jour', endedAt,
  exerciseIds: ['t20', 'd16'], steps: 2, successes: 1,
  darts: 22, accuracyPct: 42, performanceScore: 51,
  participantId: 'account_a', stepResults: steps,
});
const session = (id, endedAt, exerciseId, step, programId = 'day_plan', participantId = 'account_a') => ({
  id, modeId: 'training_lab', endedAt, startedAt: endedAt - 10000,
  participantId, darts: 10, hits: 6, points: 60, accuracyPct: 60,
  success: true, config: programId ? { programId, programStep: step } : { sessionKind: 'exercise' },
  metrics: { exerciseId, exerciseTitle: exerciseId, performanceScore: 72, goal: 10, programId: programId || null, programStep: step },
});
const stored = [
  { exerciseId: 't20', exerciseTitle: 'T20 — 10 impacts', darts: 10, hits: 6, points: 60, accuracyPct: 60, performanceScore: 73, completionPct: 60, goal: 10, success: true },
  { exerciseId: 'd16', exerciseTitle: 'D16 — 8 impacts', darts: 12, hits: 1, points: 32, accuracyPct: 8.3, performanceScore: 34, completionPct: 12.5, goal: 8, success: false },
];
const snapshotCards = buildTrainingSessionCards([program('new', time('20:00'), stored)], []);
assert.equal(snapshotCards.length, 1);
assert.equal(snapshotCards[0].exercises[0].performance, 73);
assert.equal(snapshotCards[0].exercises[1].success, false);
assert.equal(snapshotCards[0].exercises[1].goal, 8);
assert.equal(snapshotCards[0].exercises[1].accuracy, 8.3);

const older = program('old', time('13:00'));
const newer = program('later', time('19:00'));
const details = [
  session('old-1', time('12:10'), 't20', 1),
  session('old-2', time('12:55'), 'd16', 2),
  session('new-1', time('18:10'), 't20', 1),
  session('new-2', time('18:55'), 'd16', 2),
  session('other-person', time('18:58'), 't20', 1, 'day_plan', 'account_b'),
  session('free', time('19:12'), 't20', null, ''),
];
const cards = buildTrainingSessionCards([older, newer], details);
assert.equal(cards.length, 3, 'two programs and one free practice day');
const later = cards.find(card => card.id === 'later');
const freePractice = cards.find(card => card.kind === 'practice');
const past = cards.find(card => card.id === 'old');
assert.equal(later.exercises[0].darts, 10);
assert.equal(later.exercises[1].goal, 10);
assert.equal(freePractice.exercises.length, 1, 'program steps not duplicated as free practice');
assert.equal(past.exercises[0].performance, 72);
assert.equal(past.exercises[1].accuracy, 60);
const noDetail = buildTrainingSessionCards([program('missing', time('20:00'))], []);
assert.equal(noDetail[0].exercises[0].performance, null, 'never invent missing historical performance');
assert.equal(noDetail[0].exercises[0].success, null, 'never invent missing historical result');
const planTracker = readFileSync(new URL('../src/training/profile/trainingPlanTracker.ts', import.meta.url), 'utf8');
const play = readFileSync(new URL('../src/training/modes/lab/TrainingLabPlay.tsx', import.meta.url), 'utf8');
assert.match(planTracker, /stepResults\?: TrainingProgramStepStats\[\]/, 'program record embeds detailed results');
assert.match(play, /stepResults: programSummary\.rows\.map/, 'end-of-program saves full step breakdown');
// Round-trip the actual persistent record codec (same key and loader as existing backups).
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
};
globalThis.window = { dispatchEvent: () => {} };
const tracker = loadTs('src/training/profile/trainingPlanTracker.ts', {});
const persisted = tracker.recordTrainingProgramSession({
  ...program('persisted', time('20:00'), stored),
  durationMin: 30, plannedExerciseIds: ['t20', 'd16'], adaptationCount: 0,
  targetHitCount: 1, targetTotalCount: 2, adherencePct: 100,
  warmupPerformance: 73, corePerformance: 34, finishPerformance: 0,
  nextFamily: null, families: ['precision'],
});
assert.equal(persisted.stepResults.length, 2, 'two real steps persisted with the program');
assert.equal(persisted.stepResults[1].success, false);
assert.equal(persisted.stepResults[0].goal, 10);
const restored = tracker.loadTrainingProgramSessions('account_a');
assert.equal(restored.length, 1, 'program survives storage round-trip');
assert.equal(restored[0].stepResults[1].performanceScore, 34, 'step score survives restore');
assert.equal(restored[0].stepResults[1].hits, 1, 'per-step hit count survives restore');
console.log('Training session details V268: pure builder, legacy, isolation and persisted snapshots OK');
