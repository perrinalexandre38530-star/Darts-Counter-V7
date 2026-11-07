import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { dartsFamilyHistoryKey } from '../src/lib/historyDartsVariants.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scenarios = [
  [{ kind: 'five_lives', mode: 'five_lives' }, 'five_lives', 'partie ancienne 5 vies'],
  [{ kind: 'five_lives', variantId: 'chase' }, 'chase', 'nouvelle partie CHASE'],
  [{ kind: 'five_lives', summary: { variantId: 'chase' } }, 'chase', 'variant dans summary'],
  [{ kind: 'five_lives', payload: { variantId: 'chase' } }, 'chase', 'variant dans payload'],
  [{ kind: 'five_lives', payload: { summary: { variantId: 'chase' } } }, 'chase', 'variant dans payload.summary'],
  [{ kind: 'five_lives', payload: { config: { variantId: 'chase' } } }, 'chase', 'variant dans config'],
  [{ kind: 'five_lives', resume: { config: { variantId: 'chase' } } }, 'chase', 'variant dans reprise'],
  [{ kind: 'chase' }, 'chase', 'ancien identifiant direct CHASE'],
  [{ kind: 'Les 5 vies' }, 'five_lives', 'nom historique FR'],
  [{ kind: 'halve_it' }, 'halve_it', 'partie ancienne HALVE-IT'],
  [{ kind: 'halve_it', variantId: 'split_score' }, 'split_score', 'nouvelle partie SPLIT SCORE'],
  [{ kind: 'halve_it', summary: { variantId: 'split_score' } }, 'split_score', 'variant split summary'],
  [{ kind: 'halve_it', payload: { config: { variantId: 'split_score' } } }, 'split_score', 'variant split config'],
  [{ kind: 'halve_it', payload: { summary: { variantId: 'split_score' } } }, 'split_score', 'variant split payload.summary'],
  [{ mode: 'split_score' }, 'split_score', 'identifiant direct SPLIT SCORE'],
  [{ kind: 'steeplechase' }, null, 'ne pas confondre STEEPLECHASE et CHASE'],
  [{ kind: 'steeplechase', variantId: 'chase' }, null, 'variante accidentelle autre mode'],
  [{ kind: 'steeplechase', summary: { mode: 'steeplechase' } }, null, 'steeplechase double marqueur'],
  [{ kind: 'x01', variantId: 'chase' }, null, 'ne pas contaminer X01'],
  [{ kind: 'x01', variantId: 'split_score' }, null, 'ne pas contaminer X01 split'],
  [{ kind: 'halve_it', variantId: 'chase' }, 'halve_it', 'mauvaise variante HALVE-IT'],
  [{ kind: 'five_lives', variantId: 'split_score' }, 'five_lives', 'mauvaise variante 5 vies'],
  [{ kind: 'five_lives', summary: { game: { variantId: 'chase' } } }, 'chase', 'variant dans summary.game'],
  [{ kind: 'five_lives', payload: { state: { resumeConfig: { variantId: 'chase' } } } }, 'chase', 'variant dans payload.state.resumeConfig'],
  [{ kind: 'halve_it', payload: { resumeConfig: { variantId: 'split_score' } } }, 'split_score', 'variant dans payload.resumeConfig'],
  [{ kind: 'five_lives', payload: { visits: [] }, summary: {} }, 'five_lives', 'sauvegarde sans métadonnée'],
  [{ kind: 'halve_it', summary: { mode: 'halve_it' }, payload: { stats: {} } }, 'halve_it', 'sauvegarde HALVE-IT sans métadonnée'],
  [{ kind: 'challenge', payload: { variantId: 'chase' } }, null, 'ne pas contaminer CHALLENGE'],
];
for (const [entry, expected, label] of scenarios) {
  assert.equal(dartsFamilyHistoryKey(entry), expected, label);
}
const history = readFileSync(resolve(root, 'src/pages/HistoryPage.tsx'), 'utf8');
const summary = readFileSync(resolve(root, 'src/pages/DartsModeSummaryPage.tsx'), 'utf8');
assert.match(history, /key: "chase", label: "CHASE"/);
assert.match(history, /key: "split_score", label: "SPLIT SCORE"/);
assert.match(history, /const familyKey = dartsFamilyHistoryKey\(e\);\s*if \(familyKey\) return familyKey;/);
assert.match(history, /if \(familyKey === "chase"\) return "CHASE";/);
assert.match(history, /if \(familyKey === "split_score"\) return "SPLIT SCORE";/);
assert.match(history, /if \(familyKey\) return modeColor\[familyKey\]/);
assert.match(summary, /familyKey === "chase" && mode === "five_lives"/);
assert.match(summary, /familyKey === "split_score" && mode === "halve_it"/);
console.log(`PASS V203 — ${scenarios.length} cas de compatibilité historique et 7 contrôles d'intégration UI`);
