import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const vault = fs.readFileSync(path.join(root, 'src/pages/StorageVaultPage.tsx'), 'utf8');
const plans = fs.readFileSync(path.join(root, 'src/lib/storagePlans.ts'), 'utf8');
const direct = fs.readFileSync(path.join(root, 'src/lib/directR2BackupApi.ts'), 'utf8');
const auto = fs.readFileSync(path.join(root, 'src/lib/matchAutoBackup.ts'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const fn = fs.readFileSync(path.join(root, 'functions/api/storage/backups/[[path]].ts'), 'utf8');
const cloudApi = fs.readFileSync(path.join(root, 'src/lib/cloudStorageApi.ts'), 'utf8');

// Destinations libres.
assert.match(plans, /personal_cloud_manual/);
assert.match(vault, /device_file.*external_sd_manual.*personal_cloud_manual/s);
assert.match(vault, /Google Drive \/ OneDrive \/ Dropbox \/ Nextcloud/);

// NAS : compression côté client + timeout court + décompression côté backend.
assert.match(vault, /gzipSync/);
assert.match(vault, /_format:\s*"gzip\+store-v2"/);
assert.match(vault, /setTimeout\(\(\) => controller\.abort\(\), 5_000\)/);
assert.match(server, /decodeIncomingSyncPayload/);
assert.match(server, /format === "gzip\+store-v2"/);
assert.match(server, /payload_too_large/);
assert.match(server, /app\.post\("\/sync\/push"/);

// R2 : double verrou client + serveur, et aucun quota gratuit.
assert.match(direct, /ensureDirectR2WriteAllowed/);
assert.match(direct, /premium_required/);
assert.match(fn, /DEFAULT_FREE_QUOTA_BYTES = 0/);
assert.match(fn, /canWritePaidR2/);
assert.match(fn, /code:\s*"premium_required"/);
assert.match(fn, /parts\[1\] === "webhook"/);
assert.match(fn, /parts\[1\] === "checkout"/);
assert.match(fn, /parts\[1\] === "verify"/);

// La préférence de destination ne dépend plus du proxy NAS et l'auto-backup R2
// ne part que si le droit PREMIUM direct est actif.
const savePrefStart = cloudApi.indexOf('export async function saveAccountStoragePreferences');
const savePrefEnd = cloudApi.indexOf('export async function listCloudObjects', savePrefStart);
const savePrefBlock = cloudApi.slice(savePrefStart, savePrefEnd);
assert.doesNotMatch(savePrefBlock, /apiPost\("\/account\/storage-preferences"/);
assert.match(auto, /isDirectR2PremiumWriteAllowed/);
assert.match(auto, /uploadCloudVaultSnapshotJson/);

console.log('Destinations: NAS compressé + Local/USB/SD/cloud perso + R2 PREMIUM verrouillé: OK');
