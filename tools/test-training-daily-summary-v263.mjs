import fs from 'node:fs';

const file = 'src/training/modes/lab/TrainingLabConfig.tsx';
const source = fs.readFileSync(file, 'utf8');
const required = [
  'todayExerciseSummaries',
  'dailyQueueSummary',
  'MOYENNE DU JOUR',
  'MEILLEUR DU JOUR',
  'progressPct',
  'Aujourd\'hui :',
  'disabled={done}',
];
const missing = required.filter((token) => !source.includes(token));
if (missing.length) {
  console.error(`Training Daily Summary V263 guard failed: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Training Daily Summary V263 guard: OK');
