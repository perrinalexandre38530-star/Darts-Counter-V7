import fs from 'node:fs';
const file = 'src/training/modes/lab/TrainingLabConfig.tsx';
const src = fs.readFileSync(file, 'utf8');
const checks = [
  ['priority plan memo', 'const priorityActionPlan = React.useMemo'],
  ['priority family source', 'skillTrend.priorityFamily'],
  ['three step limit', '.slice(0, 3)'],
  ['daily queue action', 'usePriorityPlanAsDailyQueue'],
  ['target plan title', 'PLAN CIBLÉ'],
  ['step one', '1 · REPRENDRE'],
  ['step two', '2 · CONSOLIDER'],
  ['step three', '3 · VALIDER'],
  ['daily queue button', 'UTILISER COMME SÉANCE DU JOUR'],
];
for (const [label, needle] of checks) {
  if (!src.includes(needle)) {
    console.error(`❌ ${label}`);
    process.exit(1);
  }
  console.log(`✅ ${label}`);
}
console.log('\n✅ TRAINING PRIORITY PLAN V266 GUARD OK');
