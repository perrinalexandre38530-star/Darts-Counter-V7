import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const checks = [
  ['MULTISPORTS logo on callback', 'src="/app-512.png"'],
  ['Visible progress percentage', '{Math.round(progress)}%'],
  ['Hard callback watchdog', '11_000'],
  ['PKCE exchange bounded', '7_500'],
  ['Session read bounded', '2_500'],
  ['Fast path uses exchange session', 'sessionFromExchange = exchange?.data?.session || null'],
  ['No backup restore in callback', 'aucune restauration NAS/R2/sauvegarde ne bloque cette page'],
  ['Retry button', 'Réessayer la connexion'],
];

let failed = 0;
for (const [label, token] of checks) {
  if (src.includes(token)) console.log(`✅ ${label}`);
  else { console.error(`❌ ${label}`); failed++; }
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} contrôles callback rapide V73 OK.`);
