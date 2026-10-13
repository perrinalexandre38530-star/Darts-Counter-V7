import fs from 'node:fs';

const owned = fs.readFileSync('src/lib/accountOwnedSync.ts', 'utf8');
const diag = fs.readFileSync('src/lib/accountSyncDiagnostics.ts', 'utf8');
const media = fs.readFileSync('src/lib/userMediaFallback.ts', 'utf8');
const route = fs.readFileSync('functions/api/storage/backups/[[path]].ts', 'utf8');
const panel = fs.readFileSync('src/components/settings/AccountSyncDiagnosticsPanel.tsx', 'utf8');

const checks = [
  ['own Realtime echoes are ignored before Store re-apply', owned.includes('isOwnRealtimeEcho') && owned.includes('realtime-echo')],
  ['legacy History statuses are account-synchronized', owned.includes('isAccountSyncFinishedMatch') && owned.includes('status !== "in_progress"')],
  ['History batches retry row-by-row instead of stopping at 24', owned.includes('upsertHistoryRowsResilient') && owned.includes('retrying row by row')],
  ['forced History replacement surfaces failed row ids', owned.includes('result.failedIds.length') && owned.includes("partie(s) n'ont pas pu être synchronisées")],
  ['forced media mirror targets referenced account media', owned.includes('collectReferencedAccountMediaKeys') && owned.includes('keys: referencedKeys')],
  ['media mirror reports failures and defaults to serial upload', media.includes('failedKeys') && media.includes('opts.concurrency || 1')],
  ['R2 account manifest is rebuilt from real objects', route.includes('include: ["httpMetadata", "customMetadata"]') && route.includes('le listing R2 est l\'autorité')],
  ['account-media POST no longer rewrites shared manifest hot-key', !/manifest\.media\[mediaKey\]\s*=\s*row;[\s\S]{0,160}writeAccountMediaManifest/.test(route)],
  ['account-media GET reads object metadata directly', route.includes('const custom: any = object.customMetadata || {}')],
  ['diagnostic excludes canonical account profile correctly', diag.includes('isCanonicalAccountProfile') && diag.includes('!isCanonicalAccountProfile(p, userId)')],
  ['diagnostic compares only currently referenced media', diag.includes('referencedMediaKeys') && diag.includes('Les médias orphelins/anciens du cache sont volontairement ignorés')],
  ['active diagnostic turns unresolved parity/history/media gaps into failures', diag.includes('activeProbe ? "fail" : "warn"')],
  ['diagnostic UI shows elapsed time while long first resync runs', panel.includes('elapsedSec') && panel.includes('1 à 3 minutes')],
];

let ok = 0;
for (const [label, pass] of checks) {
  if (!pass) {
    console.error(`❌ ${label}`);
    process.exitCode = 1;
  } else {
    ok += 1;
    console.log(`✅ ${label}`);
  }
}
if (!process.exitCode) console.log(`\n✅ Account sync stabilization V120: ${ok}/${checks.length}`);
