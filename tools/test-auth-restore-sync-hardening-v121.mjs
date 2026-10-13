import fs from 'node:fs';

const files = {
  api: fs.readFileSync('src/lib/apiClient.ts', 'utf8'),
  r2: fs.readFileSync('src/lib/directR2BackupApi.ts', 'utf8'),
  sync: fs.readFileSync('src/lib/accountOwnedSync.ts', 'utf8'),
  diag: fs.readFileSync('src/lib/accountSyncDiagnostics.ts', 'utf8'),
  storage: fs.readFileSync('src/lib/storage.ts', 'utf8'),
};

const historyBatchMatch = files.sync.match(/HISTORY_BATCH_SIZE = (\d+)/);
const historyBatchSize = Number(historyBatchMatch?.[1] || 99);

const checks = [
  ['bridge refreshSession', files.api.includes('supabase.auth.refreshSession()')],
  ['bridge retry 401/403', files.api.includes('res.status === 401 || res.status === 403')],
  ['expired NAS JWT rejected', files.api.includes('isUsableNasAccessToken')],
  ['R2 live Supabase first', files.r2.includes('readLiveSupabaseStorageToken')],
  ['R2 retry after auth rejection', files.r2.includes('forceSupabaseRefresh: true')],
  ['R2 auth diagnostic', files.r2.includes('getDirectR2AuthHealth')],
  ['History batches <= 12', historyBatchSize <= 12],
  ['shared canonical profile filter', files.sync.includes('export function getAccountOwnedLocalProfiles') && files.diag.includes('getAccountOwnedLocalProfiles')],
  ['Realtime normalized', files.sync.includes('normalizeSyncRow') && !files.sync.includes('Object.keys(event.new).length')],
  ['collection payload guard', files.sync.includes('collectionPayloadItems')],
  ['restore profiles deduped', files.storage.includes('effectivePortableProfiles')],
  ['diagnostic v121', files.diag.includes('version: "v121"') && files.diag.includes('JWT Supabase / bridge R2')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) failed += 1;
}
console.log(`V121 auth/restore/sync hardening: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
