import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const api = read('src/lib/directR2BackupApi.ts');
const media = read('src/lib/userMediaFallback.ts');
const sync = read('src/lib/accountOwnedSync.ts');
const storage = read('src/lib/storage.ts');
const cloudRestore = read('src/lib/cloudBackup/restoreBackup.ts');
const worker = read('functions/api/storage/backups/[[path]].ts');
const middleware = read('functions/api/storage/backups/_middleware.ts');
const vault = read('src/lib/storageVault.ts');
const dartsets = read('src/lib/dartSetsStore.ts');

const tests = [];
const add = (name, ok) => tests.push([name, !!ok]);

add('account media has a dedicated R2 route independent from premium backup writes',
  worker.includes('parts[0] === "account-media"') &&
  worker.includes('DEFAULT_ACCOUNT_MEDIA_QUOTA_BYTES') &&
  !/parts\[0\] === "account-media"[\s\S]{0,2200}canWritePaidR2/.test(worker));

add('account media is binary in R2 with strict per-object and per-account quotas',
  worker.includes('request.arrayBuffer()') &&
  worker.includes('accountMediaMaxBytesForKind') &&
  worker.includes('account_media_quota_exceeded') &&
  worker.includes('bucket.put(objectKey, bytes'));

add('client uploads and downloads account media without requiring cloud_r2 as backup destination',
  api.includes('uploadAccountR2Media') &&
  api.includes('downloadAccountR2Media') &&
  api.includes('/account-media/') &&
  !/uploadAccountR2Media[\s\S]{0,1800}ensureDirectR2WriteAllowed/.test(api));

add('images are compressed/limited before remote account storage',
  media.includes('MAX_IMPORTED_IMAGE_BYTES = 12 * 1024 * 1024') &&
  media.includes('maxEdge: 320') &&
  media.includes('kind === "dartset_main"') &&
  media.includes('kind === "team_cover"'));

add('local media capture always mirrors to account R2 while premium R2 backup remains optional',
  media.includes('const mirrorAccount = opts.mirrorAccount !== false && canRemote') &&
  media.includes('const mirrorR2 = opts.mirrorR2 !== false && canRemote') &&
  media.includes('uploadAccountR2Media(entry)'));

add('remote hydration reads account media before legacy premium R2 backup fallbacks',
  media.indexOf('downloadAccountR2Media(key)') > 0 &&
  media.indexOf('downloadAccountR2Media(key)') < media.indexOf('downloadDirectR2MediaFallback(key)'));

add('dart sets metadata is now account-owned and realtime-synchronized',
  sync.includes('dartSets: "dart_sets"') &&
  sync.includes('serializeDartSets') &&
  sync.includes('hydrateDartSets') &&
  sync.includes('dc-dartsets-updated'));

add('media upload completion forces a lightweight metadata repush to close the realtime race',
  sync.includes('ACCOUNT_MEDIA_SYNCED_EVENT') &&
  sync.includes('onAccountMediaSynced') &&
  sync.includes('pushDocument(DOC.teams, serializeTeams())'));

add('restoring a backup force-replaces account history and syncs all account-owned collections',
  sync.includes('forcePushHistoryReplacement') &&
  sync.includes('forcePushAllLocalToAccount') &&
  sync.includes('mirrorAllLocalUserMediaToAccountR2'));

add('modern and legacy backup restores both wait for account resynchronization',
  storage.includes('__forceAccountOwnedSyncNow') &&
  storage.includes('Synchronisation de la sauvegarde restaurée avec votre compte') &&
  cloudRestore.includes('__forceAccountOwnedSyncNow'));

add('portable backups stay autonomous for Drive/NAS/SD/file by embedding the local media vault',
  storage.includes('exportUserMediaFallbackSnapshot') &&
  storage.includes('userMediaFallbacks') &&
  storage.includes('includeEmbeddedMedia'));

add('a pre-restore local safety generation is retained for rollback',
  vault.includes('source: "local" | "auto" | "before-restore"') &&
  vault.includes('Sécurité avant restauration') &&
  vault.includes('MAX_LOCAL_SLOTS = 10'));

add('deleting teams/gallery/dartsets cleans account-media objects to protect the quota',
  dartsets.includes('deleteAccountR2Media(dartSetMainMediaKey') &&
  read('src/lib/petanqueTeamsStore.ts').includes('deleteAccountR2Media(teamLogoMediaKey') &&
  read('src/lib/avatarGallery.ts').includes('deleteAccountR2Media(galleryItemMediaKey'));

add('Capacitor CORS exposes account-media response metadata',
  middleware.includes('Access-Control-Expose-Headers') && middleware.includes('X-MSS-Media-Missing'));

for (const [name, ok] of tests) console.log(`${ok ? '✅' : '❌'} ${name}`);
const passed = tests.filter(([, ok]) => ok).length;
console.log(`\n${passed === tests.length ? '✅' : '❌'} Account media + restore V119: ${passed}/${tests.length}`);
if (passed !== tests.length) process.exit(1);
