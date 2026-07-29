import fs from 'node:fs';
import assert from 'node:assert/strict';

const vault = fs.readFileSync('src/pages/StorageVaultPage.tsx', 'utf8');
const ext = fs.readFileSync('src/lib/externalBackupTarget.ts', 'utf8');
const cloud = fs.readFileSync('src/lib/cloudStorageApi.ts', 'utf8');
const cloudAuto = fs.readFileSync('src/lib/cloudAccountBackup.ts', 'utf8');
const matchAuto = fs.readFileSync('src/lib/matchAutoBackup.ts', 'utf8');
const backend = fs.readFileSync('/mnt/data/work_v17/server.NAS.patched.js', 'utf8');

assert.match(vault, /NAS_PUSH_TIMEOUT_MS\s*=\s*30_000/);
assert.match(vault, /summary:\s*summary \|\| undefined/);
assert.match(backend, /transportPassthrough/);
assert.match(backend, /deferVersionedSlot:\s*true/);
assert.match(backend, /setImmediate\(\(\) => \{ void createVersionedSlot\(\); \}\)/);
assert.match(backend, /premium_required/);
assert.match(backend, /Sauvegarde Cloud R2 réservée aux offres PREMIUM actives/);
assert.match(ext, /picker-fallback/);
assert.match(ext, /downloadExternalBackupJson/);
assert.match(cloud, /isDirectR2PremiumWriteAllowed/);
assert.match(cloudAuto, /if \(!isDirectR2PremiumWriteAllowed\(r2Usage\)\) return/);
assert.match(matchAuto, /return isDirectR2PremiumWriteAllowed\(usage\)/);

console.log('BACKUP RELIABILITY V17: NAS fast commit + external fallback + R2 premium hard-lock: OK');
