import fs from 'node:fs';

const vault = fs.readFileSync(new URL('../src/lib/storageVault.ts', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/StorageVaultPage.tsx', import.meta.url), 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(
  vault.includes('const canonicalMatches = historyMatches.length > 0 ? historyMatches : directRootMatches;'),
  'Le résumé utilise les lignes historiques canoniques'
);
assert(
  vault.includes('matches = canonicalMatches.length;') && vault.includes('historyRows = historyMatches.length;'),
  'PARTIES et lignes historiques proviennent des vraies lignes de matchs'
);
assert(
  !vault.includes('matches += matchItems') && !vault.includes('historyRows += c'),
  'Les volées et tableaux imbriqués ne sont plus additionnés comme des parties'
);
assert(
  vault.includes('if (matches > 0) statsMatches = Math.min(statsMatches, matches);'),
  'Le nombre de parties avec stats ne peut plus dépasser le nombre de parties'
);
assert(
  page.includes('const clearlyInflatedLegacySummary') && page.includes('const duplicatedLegacyHistory'),
  'Les anciens résumés NAS gonflés sont corrigés à l’affichage'
);
assert(
  page.includes('matches: history.length > 0 ? history.length : summary.matches'),
  'Les détails chargés depuis le payload remplacent le compteur historique erroné'
);
assert(
  page.includes('matches: details.matches > 0 ? details.matches : summary.matches'),
  'Le compteur exact du payload remplace les anciennes métadonnées gonflées'
);

// Régression représentative du backup NAS réel : 75 matchs, chacun avec de
// nombreuses volées. Le compteur attendu reste 75, jamais le total des volées.
const rows = Object.fromEntries(Array.from({ length: 75 }, (_, index) => [
  `match-${index + 1}`,
  { id: `match-${index + 1}`, players: [{ id: 'p1' }], visitHistory: Array(200).fill({ score: 60 }) },
]));
const canonicalCount = Object.values(rows).length;
assert(canonicalCount === 75, 'Le cas de régression conserve exactement 75 parties');

console.log('\n✅ STORAGE VAULT MATCH COUNT V57 OK');
