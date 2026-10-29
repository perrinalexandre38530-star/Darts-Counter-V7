import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const expect = (name, ok) => {
  if (!ok) throw new Error(`❌ ${name}`);
  console.log(`✅ ${name}`);
};

const main = read('src/main.tsx');
const app = read('src/App.tsx');
const offline = read('src/lib/offlineFirstRuntime.ts');
const orchestrator = read('src/lib/sync/syncOrchestrator.ts');
const incremental = read('src/lib/incrementalBackupJournal.ts');
const incrementalRemote = read('src/lib/incrementalRemoteSync.ts');
const matchBackup = read('src/lib/matchAutoBackup.ts');
const accountBackup = read('src/lib/backup/accountBackupCoordinator.ts');
const history = read('src/lib/history.ts');
const accountOutbox = read('src/lib/accountProfileOutbox.ts');
const trainingHook = read('src/training/sync/useTrainingAutoSync.ts');
const sw = read('public/sw.js');
const storagePlans = read('src/lib/storagePlans.ts');
const diagnostics = read('src/components/settings/BackupDiagnosticsPanel.tsx');
const viteConfig = read('vite.config.ts');
const headers = read('public/_headers');

expect('Global sync orchestrator starts from main', main.includes('initGlobalSyncOrchestrator()'));
expect('Offline runtime exposes remote-work guard', offline.includes('shouldAttemptRemoteWork'));
expect('Global orchestrator owns reconnect', orchestrator.includes('window.addEventListener("online", onOnline'));
expect('Legacy incremental init no longer installs its own online listener', !/initIncrementalRemoteSync[\s\S]{0,900}addEventListener\(['\"]online['\"]/.test(incrementalRemote));
expect('Hidden/background requests checkpoint pass', orchestrator.includes('hidden-checkpoint'));
expect('Initial checkpoint policy exists', incremental.includes('INITIAL_CHECKPOINT_PENDING') && incremental.includes('INITIAL_CHECKPOINT_AGE_MS'));
expect('Checkpoint compaction records compacted count', incremental.includes('compactedChanges') && incremental.includes('checkpointCount'));
expect('R2 full checkpoint uses direct R2 route', matchBackup.includes('createDirectR2Backup') && matchBackup.includes('R2 PREMIUM is authenticated independently'));
expect('R2 match list does not require NAS token', /listCloudMatchBackups[\s\S]{0,350}shouldUseCloudR2/.test(matchBackup) && !/listCloudMatchBackups[\s\S]{0,250}readNasAccessToken/.test(matchBackup));
expect('Offline account restore scan is blocked', accountBackup.includes('offline-local-authority') && accountBackup.includes('shouldAttemptRemoteWork'));
expect('History cloud import protects newer local record', history.includes('cloud_older_than_local') && history.includes('local_newer_same_payload'));
expect('Account profile has persistent offline outbox', accountOutbox.includes('dc_account_profile_outbox_v1') || accountOutbox.includes('OUTBOX'));
expect('Training delegates auto-sync to global orchestrator', trainingHook.includes('requestGlobalSync') && !trainingHook.includes('setInterval'));
expect('Browser storage quota estimation exists', storagePlans.includes('estimateBrowserStorage'));
expect('Backup diagnostics show LOCAL authority', diagnostics.includes('LOCAL / IndexedDB') && diagnostics.includes('Synchronisation globale'));
expect('PWA service worker contains offline shell fallback', /cache|offline/i.test(sw) && /fetch/i.test(sw));
expect('Vite build emits manifest for offline precache', /manifest\s*:\s*["']manifest\.json["']/.test(viteConfig));
expect('Service worker precaches Vite manifest chunks', sw.includes('readViteManifestAssets') && sw.includes('PRECACHE_APP_SHELL') && sw.includes('/manifest.json'));
expect('App contains local/offline gate policy', /offline|local/i.test(app));

expect('SW registration cannot miss an already-fired load event', main.includes('document.readyState === "complete"') && main.includes('installProdServiceWorker'));
expect('Offline chunk failure never purges SW/cache', /hardRecoverFromChunkFailure[\s\S]{0,700}!shouldAttemptRemoteWork\(\)/.test(main) && /recoverDynamicImportOnce[\s\S]{0,500}!shouldAttemptRemoteWork\(\)/.test(main));
expect('SW install refuses empty/incomplete Vite precache', sw.includes('strict: true') && sw.includes('failedCodeAssets') && sw.includes('Vite manifest absent ou vide'));
expect('Cloudflare never serves a stale Vite manifest', /\/manifest\.json[\s\S]{0,120}Cache-Control: no-store/.test(headers));

console.log('\n✅ OFFLINE-FIRST FINAL CONTRACT 23/23');
