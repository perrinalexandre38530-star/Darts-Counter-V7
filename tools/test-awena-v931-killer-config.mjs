import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const detail = read("src/awena/AwenaDetailedKnowledge.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
function assert(c,m){ if(!c) throw new Error(m); }
const start = detail.indexOf('  killer: {');
const end = detail.indexOf('\n  cricket: {', start);
assert(start >= 0 && end > start, 'Bloc Killer introuvable');
const killer = detail.slice(start,end);
const required = [
  'VOL DE VIES — LIFE STEAL',
  'BULL = dégâts à tous',
  'BULL = soins',
  '+1, +2 ou +3',
  'Rotation BULL',
  'DBULL = bouclier',
  '1 à 5 tours',
  'DBULL = désarmement',
  'Rotation DBULL',
  'BONUS BOUCLIER AU CHOIX DU NUMÉRO',
  'MISS = AUTO-HIT',
  '1 Joueur (1×)',
  'All (1×)',
  'All (illimité)',
  '1 à 6 vies',
  'protection blanche temporaire',
  'INCOMPATIBILITÉS / OPTIONS GRISÉES',
];
for (const token of required) assert(killer.includes(token), `Killer configuration incomplète : ${token}`);
assert(overlay.includes('LOCAL V9.3.1 · MODE PRECISION · KILLER CONFIG COMPLETE'), 'Badge V9.3.1 absent');
console.log(`AWENA V9.3.1 KILLER CONFIG COMPLETE OK — ${required.length} contrôles dédiés.`);
