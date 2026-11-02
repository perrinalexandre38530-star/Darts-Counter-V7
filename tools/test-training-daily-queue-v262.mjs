import fs from 'node:fs';

const config = fs.readFileSync('src/training/modes/lab/TrainingLabConfig.tsx', 'utf8');
const queue = fs.readFileSync('src/training/profile/trainingDailyQueue.ts', 'utf8');

const checks = [
  ['daily queue title', config.includes('MA SÉANCE DU JOUR')],
  ['queue persisted by account', queue.includes('dc_training_daily_queue_v1:')],
  ['queue limited to three items', queue.includes('const MAX_ITEMS = 3')],
  ['daily completion computed from sessions', config.includes('completedExerciseIdsToday')],
  ['queue can replace one exercise', config.includes('replaceDailyQueueItem')],
  ['queue can rebuild from recommendations', config.includes('rebuildDailyQueue')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`❌ ${name}`);
  process.exit(1);
}
for (const [name] of checks) console.log(`✅ ${name}`);
console.log('\n✅ TRAINING DAILY QUEUE V262 OK');
