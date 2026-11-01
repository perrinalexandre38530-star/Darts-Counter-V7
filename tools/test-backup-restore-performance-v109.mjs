import fs from 'node:fs';

const storage = fs.readFileSync(new URL('../src/lib/storage.ts', import.meta.url), 'utf8');
const history = fs.readFileSync(new URL('../src/lib/historyCloud.ts', import.meta.url), 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(storage.includes('const currentStoreForSnapshot: any = snapshotStore || await loadCanonicalAccountStoreForSnapshot()'), 'W7 réutilise le store canonique déjà exporté pendant le snapshot');
assert(storage.includes('currentStore: currentStoreForSnapshot') && storage.includes('tournaments: snapshotTournaments'), 'portableAccountData réutilise store + compétitions déjà collectés');
assert(storage.includes('mediaAlreadyCaptured: embeddedMediaCaptureReady'), 'W7 évite une seconde capture média lorsque la première a réussi');
assert(!storage.includes('const clone: any = safeJsonParse(safeJsonStringify(dump || {}), dump || {});'), 'W7 supprime la copie intégrale stringify/parse du snapshot');
assert(storage.includes('idb: { ...dump.idb }'), 'W7 utilise une copie structurelle légère des blocs qui seront modifiés');
assert(!storage.includes('finishPerf({ ok: true, bytes: safeJsonStringify(clone, "").length'), 'W7 ne stringify plus tout le snapshot uniquement pour la télémétrie');
assert(storage.includes('const restoreChunkSize = 3') && storage.includes('Promise.all(chunk.map'), 'La restauration IndexedDB traite les clés indépendantes par petits lots');
assert(history.includes('const existingDump = await exportHistoryV4Snapshot()'), 'Le diff de restauration History utilise directement le snapshot V4 léger');
assert(history.includes("exportHistoryDump()\n      .catch"), 'Un fallback legacy complet reste présent si V4 est indisponible');

console.log('\n✅ BACKUP/RESTORE PERFORMANCE W7 CONTRACT OK');
