import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const vaultPath = path.join(root, 'src/pages/StorageVaultPage.tsx');
const code = fs.readFileSync(vaultPath, 'utf8');
const start = code.indexOf('const createSelectedDestinationBackup = async () => {');
const end = code.indexOf('\n  const restoreNas = async', start);
assert.ok(start >= 0 && end > start, 'pipeline principal de sauvegarde introuvable');
const fn = code.slice(start, end);

function branch(from, to) {
  const a = fn.indexOf(from);
  const b = fn.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, `branche ${from} introuvable`);
  return fn.slice(a, b);
}

const local = branch('if (destination === "app_local")', 'if (destination === "device_file"');
assert.match(local, /createLocalMemorySlotFromSnapshot/);
assert.doesNotMatch(local, /pushSnapshotToNasFast|uploadCloudVaultSnapshotJson|api\.multisports-api/);

const file = branch('if (destination === "device_file" || destination === "external_sd_manual")', 'if (destination === "cloud_r2")');
assert.match(file, /chooseExternalBackupFileWithJson|writeExternalBackupJsonNow|downloadExternalBackupJson/);
assert.doesNotMatch(file, /pushSnapshotToNasFast|uploadCloudVaultSnapshotJson/);

const cloud = branch('if (destination === "cloud_r2")', '// NAS :');
assert.match(cloud, /uploadCloudVaultSnapshotJson/);
assert.doesNotMatch(cloud, /pushSnapshotToNasFast|createNasVersionedSnapshot/);

const nas = fn.slice(fn.indexOf('// NAS :'));
assert.match(nas, /createLocalMemorySlotFromSnapshot/);
assert.match(nas, /pushSnapshotToNasFast/);
assert.doesNotMatch(nas, /uploadCloudVaultSnapshotJson/);

const directApi = fs.readFileSync(path.join(root, 'src/lib/directR2BackupApi.ts'), 'utf8');
assert.match(directApi, /DIRECT_BASE\s*=\s*["']\/api\/storage\/backups["']/);
assert.doesNotMatch(directApi, /api\.multisports-api\.fr|\/api\/backend\/.*storage/);

assert.match(code, /setTimeout\(\(\) => controller\.abort\(\), 5_000\)/, 'NAS doit être borné à 5 s');

const backend = fs.readFileSync(path.join(root, 'backend-nas/server.js'), 'utf8');
assert.match(backend, /storage-entitlement-v1\.json/);
assert.match(backend, /syncStorageEntitlementMirrors\(user, activatedPreference\)/);
assert.match(backend, /syncStorageEntitlementMirrors\(user, pref\)/);
assert.match(backend, /STRIPE_PRICE_STORAGE_STARTER_MONTHLY/);

console.log('Destinations sauvegarde: Local / Fichier / R2 / NAS isolées: OK');
