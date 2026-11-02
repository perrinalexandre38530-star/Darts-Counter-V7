import fs from 'node:fs';

const config = fs.readFileSync('src/training/modes/lab/TrainingLabConfig.tsx', 'utf8');
const review = fs.readFileSync('src/training/profile/trainingDailyReview.ts', 'utf8');
const checks = [
  ['review builder exported', review.includes('export function buildTrainingDailyReview')],
  ['7 day window', review.includes('length: 7') && review.includes('index - 6')],
  ['previous week window', review.includes('index - 13')],
  ['only exercise sessions', review.includes('exerciseIdOf(row)')],
  ['daily review wired', config.includes('buildTrainingDailyReview(sessions as any[])')],
  ['7 day UI present', config.includes('RYTHME 7 JOURS')],
  ['week comparison UI present', config.includes('Vs semaine préc.')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`FAIL: ${name}`);
  process.exit(1);
}
for (const [name] of checks) console.log(`OK: ${name}`);
console.log('Training Daily Review V264 Guard: OK');
