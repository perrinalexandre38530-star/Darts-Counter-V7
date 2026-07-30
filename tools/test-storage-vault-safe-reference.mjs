import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url));
const text = (p) => read(p).toString('utf8');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const lineCount = (s) => s.split(/\r?\n/).length - (s.endsWith('\n') ? 1 : 0);

const page = text('../src/pages/StorageVaultPage.tsx');
const serverBuffer = read('../server.js');
const server = serverBuffer.toString('utf8');
const schemaBuffer = read('../schema.sql');
const schema = schemaBuffer.toString('utf8');

assert.equal(sha256(serverBuffer), '23b7560f7f7be0fcd2bf865f8476163b72f1af26317df4486b130873c69106fa');
assert.equal(sha256(schemaBuffer), 'f41f867f5ea42d6843d9af6687cb37e8d179dbc2ddb3a0d559f0375208e8803a');
assert.equal(lineCount(server), 13554);
assert.equal(lineCount(schema), 799);

assert.match(page, /import BackDot from "\.\.\/components\/BackDot"/);
assert.match(page, /import InfoDot from "\.\.\/components\/InfoDot"/);
assert.match(page, /CompressionStream/);
assert.match(page, /gzipSync\(strToU8\(json\), \{ level: 1 \}\)/);
assert.match(page, /localSafetyPromise/);
assert.match(page, /needRemoteMatches = tab === "matches"/);
assert.match(page, /Gérer \/ souscrire à une offre Cloud PREMIUM/);
assert.match(page, /showSaveFilePicker/);

assert.match(server, /async function encodeSnapshotForTextStore/);
assert.match(server, /transportPassthrough: true/);
assert.match(server, /deferVersionedSlot: true/);
assert.match(server, /app\.post\("\/sync\/match-backups"/);
assert.match(server, /app\.get\("\/sync\/match-backups"/);
assert.match(server, /app\.get\("\/sync\/slots\/trash"/);
assert.match(server, /NAS_R2_MIRROR_ENABLED \? "ON" : "OFF"/);
assert.match(schema, /CREATE TABLE IF NOT EXISTS user_match_backups/);
assert.match(schema, /deleted_at TIMESTAMPTZ/);

console.log('✅ server.js intégral préservé : 13 554 lignes, SHA-256 identique');
console.log('✅ schema.sql intégral préservé : 799 lignes, SHA-256 identique');
console.log('✅ StorageVault : BackDot, InfoDot, icônes, compression rapide et commandes conservées');
