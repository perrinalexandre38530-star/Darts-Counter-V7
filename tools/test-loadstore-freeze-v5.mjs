import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const storage = fs.readFileSync(path.join(root, 'src/lib/storage.ts'), 'utf8');
const freeze = fs.readFileSync(path.join(root, 'src/lib/freezeWatch.ts'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'src/pages/Settings.tsx'), 'utf8');

const checks = [
  ['single-flight map', storage.includes('loadStoreInFlightByScope') && storage.includes('storage.loadStore.coalesced')],
  ['burst cache', storage.includes('LOAD_STORE_BURST_CACHE_TTL_MS') && storage.includes('storage.loadStore.cache-hit')],
  ['stage instrumentation', storage.includes('runLoadStoreStage') && storage.includes('storage.loadStore.${stage}')],
  ['json parse stage', storage.includes('"jsonParse"') && storage.includes('jsonChars: json.length')],
  ['legacy store compaction', storage.includes('legacyCompaction') && storage.includes('legacy-store-compacted')],
  ['richer profile scan gated', storage.includes('shouldScanForRicherPersistedStore(parsed)')],
  ['save invalidates load cache', storage.includes('invalidateLoadStoreBurstCache(getActiveStoreScopeKey());')],
  ['freeze diagnosis prioritizes loadStore', freeze.includes('storage.loadStore.stage-warning') && freeze.includes('loadStore.${stage}')],
  ['settings exposes V5 stage', settings.includes('loadStore V5 — dernière étape suspecte')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    failed++;
    console.error(`❌ ${name}`);
  } else {
    console.log(`✅ ${name}`);
  }
}
if (failed) process.exit(1);
console.log('✅ loadStore freeze V5 contract OK');
