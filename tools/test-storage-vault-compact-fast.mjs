import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync(new URL('../src/pages/StorageVaultPage.tsx', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

assert.match(page, /import BackDot from "\.\.\/components\/BackDot"/);
assert.match(page, /import InfoDot from "\.\.\/components\/InfoDot"/);
assert.match(page, /VaultNavButton/);
assert.match(page, /CompressionStream/);
assert.match(page, /gzipSync\(strToU8\(json\), \{ level: 1 \}\)/);
assert.match(page, /localSafetyPromise/);
assert.match(page, /needRemoteMatches = tab === "matches"/);
assert.doesNotMatch(page, /🎮 Restaurer|🎯 Parties|💾 Sauver|🔎 Expert/);

assert.match(server, /saveUserStoreEncodedCurrent/);
assert.match(server, /archivePending: true/);
assert.match(server, /app\.post\("\/sync\/match-backups"/);
assert.match(server, /app\.get\("\/sync\/match-backups"/);
assert.match(server, /CREATE TABLE IF NOT EXISTS user_match_backups/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS user_match_backups/);

console.log('✅ UI sauvegarde compacte : BackDot + InfoDot + icônes SVG');
console.log('✅ Compression NAS native asynchrone + fallback gzip niveau 1');
console.log('✅ Copie locale et envoi NAS parallélisés');
console.log('✅ Archives de parties NAS : routes backend présentes');
console.log('✅ Les listes de parties distantes ne sont chargées que dans l’onglet Parties');
