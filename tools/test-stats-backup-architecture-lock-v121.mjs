import fs from 'node:fs';
import { analyzeLegacySnapshot, buildLegacyMigrationSnapshot, isLegacyMigrationCandidate } from '../src/data/legacyMigrationV1.ts';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const assert = (ok, message) => {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
};

const history = read('src/lib/history.ts');
const historyV4 = read('src/lib/historyV4.ts');
const stats = read('src/lib/stats/rebuildStatsFromHistory.ts');
const sync = read('src/lib/accountOwnedSync.ts');
const storage = read('src/lib/storage.ts');
const manualNas = read('src/lib/manualNasSync.ts');
const completed = read('src/lib/completedMatchAutoBackup.ts');
const coordinator = read('src/lib/backup/accountBackupCoordinator.ts');
const legacyRuntime = read('src/lib/legacyMigrationRuntime.ts');
const pkg = JSON.parse(read('package.json'));

// Functional proof: a backup that only contains a derived stats_index is not
// allowed to manufacture canonical matches.
const statsOnlyLegacy = {
  _v: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  idb: {
    dc_stats_index_v2: {
      meta: { rowsScanned: 2 },
      totals: { matches: 2 },
      matchIdsByMode: { x01: ['legacy-match-a', 'legacy-match-b'] },
    },
  },
  localStorage: {},
  portableAccountData: { profiles: [] },
};
assert(isLegacyMigrationCandidate(statsOnlyLegacy), 'Le vieux backup stats-only reste détectable par le migrateur');
const plan = analyzeLegacySnapshot(statsOnlyLegacy);
assert(Object.keys(plan.history.acceptedRows).length === 0, 'Un stats_index dérivé ne fabrique aucune ligne History V4');
assert(plan.history.actions.length === 2 && plan.history.actions.every((a) => a.disposition === 'quarantined'), 'Les IDs stats-only sont conservés uniquement en quarantaine diagnostique');
assert(plan.history.actions.every((a) => a.reason === 'stats-index-only-no-original-history'), 'La quarantaine identifie explicitement l’absence d’History original');
const normalized = buildLegacyMigrationSnapshot(plan, statsOnlyLegacy);
assert(Object.keys(normalized?.history?.rows || {}).length === 0, 'Le snapshot legacy assaini ne réinjecte aucun faux match');

// Static architecture locks: these rules must remain true after future patches.
assert(history.includes('History V4 is now the ONLY read authority'), 'History V4 reste l’unique autorité de lecture History');
assert(history.includes('direct canonical read') && history.includes('return null;'), 'History.get ne ressuscite pas un miroir legacy absent du canonique');
assert(historyV4.includes('getHistoryV4AuthorityStamp'), 'History V4 conserve son fingerprint d’autorité');
assert(stats.includes('historyFingerprint') && stats.includes('statsIndexMatchesHistoryAuthority'), 'stats_index reste dérivé et lié au fingerprint History');
assert(sync.includes('Legacy remote cache: ignored') && !sync.includes('await syncScalarDocument(DOC.statsIndex, currentStats'), 'stats_index distant ne redevient pas une source synchronisée');
assert(storage.includes('assertCrossDeviceReleaseManifest') && storage.includes('buildCrossDeviceReleaseManifest'), 'Backup/restore conserve le Release Gate inter-appareils W8');
assert(!manualNas.includes('export async function pushNasAccountSnapshotLegacy'), 'Le second pipeline complet NAS legacy a été supprimé');
assert(manualNas.includes('pushNasAccountSnapshot()') && manualNas.includes('buildCanonicalBackupArtifact') && manualNas.includes('pushNasPreparedArtifact'), 'Le NAS utilise un seul pipeline snapshot canonique');
assert(completed.includes('Compatibility shim') && !completed.includes('saveConfiguredBackupNow'), 'Le shim de fin de partie ne reconstruit jamais de snapshot complet');
assert(coordinator.includes('if (primary.length) return primary') && coordinator.includes('source: "legacy-auto"'), 'Les anciennes sauvegardes auto restent un secours de migration uniquement');
assert(legacyRuntime.includes('statsOnlyEvidence > 0 && acceptedHistoryRows === 0'), 'Une restauration autoritaire stats-only est refusée avant de toucher History');

const lockScript = String(pkg.scripts?.['test:stats-backup-architecture-lock'] || '');
const buildScript = String(pkg.scripts?.build || '');
const historyIntegrityScript = String(pkg.scripts?.['test:history-integrity'] || '');
assert(lockScript.includes('test-stats-backup-architecture-lock-v121.mjs'), 'Le contrat W9 possède une commande npm dédiée');
assert(buildScript.includes('test:stats-backup-architecture-lock'), 'Le build bloque toute régression d’architecture Stats/Backup');
assert(historyIntegrityScript.includes('test:stats-backup-architecture-lock'), 'La chaîne History Integrity inclut le verrou W9');

console.log('\n✅ STATS / HISTORY / BACKUP ARCHITECTURE LOCK W9 OK');
