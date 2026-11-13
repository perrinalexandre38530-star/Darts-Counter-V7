/**
 * Recette automatisée hors navigateur pour LES 5 VIES, CHASE,
 * HALVE-IT et SPLIT SCORE. Zéro service externe ou dépendance réseau.
 * Commande: node tools/test-chase-halveit-qa-v222.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  'test-chase-halveit-core-v222.mjs',
  'test-chase-halveit-ranking-v223.mjs',
  'test-chase-halveit-split-v138.mjs',
  'test-chase-halveit-resume-v141.mjs',
  'test-chase-halveit-play-ui-v146.mjs',
  'test-chase-halveit-layout-v153.mjs',
  'test-chase-halveit-mobile-layout-v158.mjs',
  'test-chase-halveit-volley-guard-v164.mjs',
  'test-halveit-split-final-v177.mjs',
  'test-chase-halveit-results-v182.mjs',
  'test-five-lives-chase-undo-v184.mjs',
  'test-chase-halveit-history-v203.mjs',
  'test-chase-halveit-stats-source-v206.mjs',
  'test-chase-halveit-confirmed-history-v217.mjs',
  'test-chase-halveit-restore-v218.mjs',
  'test-chase-halveit-final-recovery-v219.mjs',
  'test-chase-halveit-account-drafts-v221.mjs',
];
let failed = 0;
for (const file of suites) {
  const p = spawnSync(process.execPath, ['--experimental-strip-types', resolve(root, 'tools', file)], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' }, timeout: 30000,
  });
  const good = p.status === 0 && !p.error;
  process.stdout.write(`${good ? '✓' : '✗'} ${file}\n`);
  if (!good) {
    failed++;
    if (p.error) process.stderr.write(`${p.error.message}\n`);
    process.stderr.write((p.stderr || '') + (p.stdout || ''));
  }
}
console.log(`Bilan : ${suites.length - failed}/${suites.length} suites de tests réussies`);
if (failed) process.exitCode = 1;
