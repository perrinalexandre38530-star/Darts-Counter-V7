import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const layout = read('src/training/ui/TrainingPlayLayout.tsx');
const input = read('src/training/ui/TrainingDartPad.tsx');
const target = read('src/training/ui/TrainingTargetPad.tsx');
const normal = read('src/training/modes/lab/TrainingLabPlay.tsx');
const extended = read('src/training/modes/lab/TrainingCustomExercisePlay.tsx');
const home = read('src/training/modes/lab/TrainingLabConfig.tsx');
const cards = read('src/training/profile/trainingSessionCards.ts');
const snapshot = read('src/training/profile/trainingPlanTracker.ts');
const technique = read('src/training/catalog/trainingTechniqueGuides.ts');
const drafts = read('src/training/profile/trainingExerciseDraft.ts');

assert.ok(layout.includes('data-mss-floating-control="awena-launcher"'), "Missing Awena suppression during play");
assert.match(layout,/playerScore/);
assert.match(layout,/sessionObjective/);
assert.match(input,/enableMethods = false/,'Other Training games must preserve their existing keypad UI');
assert.match(input,/allowQuickScore = false/,'Score-only mode should be opt-in');
assert.match(input,/"target"/);
assert.match(input,/"keypad"/);
assert.match(input,/"quick"/);
assert.match(input,/maxQuickDarts/);
assert.ok(input.includes("onQuickVisit?.(scoreNumber, safeQuickDarts)"));
assert.match(input,/Valide ou annule la volée avant de changer/,'Unvalidated darts must not be dropped');
assert.ok(target.includes("const CLOCK = [20, 1, 18, 4"), "Target order wrong");
assert.ok(target.includes("onHit(25, 1)"));
assert.ok(target.includes("onHit(25, 2)"));
assert.match(normal,/exercise.engine === "score_darts"/);
assert.ok(normal.includes('visitHistoryRef.current.push({ source: "aggregate_visit"'));
assert.ok(extended.includes('rule.kind === "survival_score" || rule.kind === "redemption"'));
assert.ok(extended.includes('rule.params?.mode !== "checkout50"'));
assert.match(snapshot,/precisionUnavailable/);
assert.match(cards,/precisionUnavailable/);
assert.match(home,/TON ESPACE D'ENTRAÎNEMENT/);
assert.match(home,/CHOISIR UN EXERCICE/);
assert.match(home,/MES SÉANCES/);
for (const key of ['tech_feet','tech_elbow','tech_rear_foot','tech_release','tech_extension','tech_follow','tech_pullback','tech_rhythm','tech_routine','tech_gaze']) {
 assert.ok(technique.includes(key), `Missing guided technique ${key}`);
}
assert.match(drafts,/remain paused while the app is closed/);
assert.match(extended,/techniqueStage/);
console.log('Training Center V269 — active HUD, keypad/target/quick methods, private stats, guided technique, resume and home: OK');
