/**
 * Recette CAPITAL V164 sur le comportement VALIDÉ actuellement dans V136.
 * Les tests V142–V147 décrivent des règles et catégories remplacées ensuite
 * (exemple : Diagonale DBULL50, noms anciens, trois niveaux sans LÉGENDES).
 * Les tests V148+ couvrent les règles en vigueur, avec leurs régressions.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const base = path.dirname(fileURLToPath(import.meta.url));
const suites = [
  'test-capital-v148.mjs',
  'test-capital-v149-miroir.mjs',
  ...Array.from({length: 14}, (_,i)=>`test-capital-v${151+i}.mjs`),
];
let failures = 0;
for (const name of suites) {
  const result = spawnSync(process.execPath, [path.join(base,name)], {stdio:'inherit',env:process.env});
  if (result.status !== 0) { failures++; console.error(`ÉCHEC : ${name}`); }
}
console.log(`Recette CAPITAL V164 — ${suites.length - failures}/${suites.length} suites courantes réussies.`);
if (failures) process.exitCode = 1;
