/** Final automated release gate for the TOP 10 / Morpion / 5 Vies family.
 * Does not touch History V4, NAS, Cloud or runtime storage. */
import { spawnSync } from 'node:child_process';

const suites = [
  'tools/test-morpion-top10-five-lives.mjs',
  'tools/test-top10-morpion-v133.mjs',
  'tools/test-top10-morpion-checkpoints-v153.mjs',
  'tools/test-top10-morpion-partial-drafts-v159.mjs',
  'tools/test-top10-morpion-commit-ack-v164.mjs',
  'tools/test-top10-morpion-input-journal-v177.mjs',
  'tools/test-morpion-resume-format-v182.mjs',
  'tools/test-morpion-history-integrity-v193.mjs',
  'tools/test-top10-morpion-resume-authority-v185.mjs',
  'tools/test-top10-morpion-final-stats-v202.mjs',
  'tools/test-top10-morpion-outcomes-v205.mjs',
  'tools/test-top10-morpion-stats-authority-v217.mjs',
  'tools/test-top10-morpion-result-consistency-v218.mjs',
  'tools/test-five-lives-confirmed-history-v219.mjs',
  'tools/test-five-lives-chase-undo-v184.mjs',
  'tools/test-chase-halveit-results-v182.mjs',
];
let failed = 0;
for (const suite of suites) {
  const run = spawnSync(process.execPath, ['--experimental-strip-types', suite], {
    cwd: process.cwd(), encoding:'utf8', timeout:30_000,
    env: { ...process.env, NODE_NO_WARNINGS:'1' },
  });
  if (run.status !== 0) {
    failed++;
    console.error(`FAIL ${suite}\n${run.stderr || run.stdout || run.error}`);
  } else {
    const output = (run.stdout || '').trim().split('\n').filter(Boolean).slice(-1)[0] || 'OK';
    console.log(`OK   ${suite}: ${output}`);
  }
}
console.log(`\nRESULT: ${suites.length - failed}/${suites.length} suites passed.`);
if (failed) process.exitCode = 1;
