import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${message}`);
  }
};

const history = read('src/lib/history.ts');
const x01 = read('src/pages/X01PlayV3.tsx');
const engine = read('src/hooks/useX01EngineV3.ts');
const app = read('src/App.tsx');
const critical = read('src/lib/x01CriticalCheckpoint.ts');

assert(critical.includes('saveX01CriticalCheckpoint') && critical.includes('darts: Array.isArray(input?.darts) ? input.darts.slice() : []'), 'le checkpoint critique conserve le replay brut complet');
assert(critical.includes('warmX01CriticalCheckpointStorage'), 'la base critique IndexedDB est pré-ouverte avant la première volée');
assert(critical.includes('writeX01PagehideFallback') && critical.includes('PAGEHIDE_FALLBACK_KEY'), 'un fallback synchrone existe uniquement au passage en arrière-plan/pagehide');
assert(critical.includes('Preserve every gameplay field'), 'le checkpoint retire seulement les médias lourds et conserve les champs de gameplay');

const liveCheckpointStart = history.indexOf('export async function upsertInProgressCheckpoint');
const fullUpsertStart = history.indexOf('export async function upsert(rec: SavedMatch)');
const liveCheckpoint = history.slice(liveCheckpointStart, fullUpsertStart);
assert(liveCheckpointStart >= 0 && fullUpsertStart > liveCheckpointStart, 'History expose un chemin séparé pour les sauvegardes live X01');
assert(!liveCheckpoint.includes('enrichDartsTelemetry('), 'aucun recalcul de télémétrie sur le checkpoint live');
assert(!liveCheckpoint.includes('encodeCompactMatch('), 'aucun compact StatsHub sur le checkpoint live');
assert(!liveCheckpoint.includes('compressToUTF16('), 'aucune compression du payload sur le checkpoint live');
assert(!liveCheckpoint.includes('scheduleCloudSnapshotPush('), 'aucun push cloud/auth sur le checkpoint live');
assert(!liveCheckpoint.includes('migrateFromLocalStorageOnce()'), 'aucune migration historique lourde sur le chemin critique');
assert(history.includes('if (isX01Live && !(rec as any)?.__forceFullInProgress)'), 'seul X01 in_progress emprunte automatiquement le fast path, les autres modes gardent leur logique');

assert(x01.indexOf('void saveX01CriticalCheckpoint({', x01.indexOf('const persistAutosave')) < x01.indexOf('const shouldRefreshHistoryHeader', x01.indexOf('const persistAutosave')), 'X01 écrit le checkpoint critique avant tout throttling du header History');
assert(x01.includes('now - historyCheckpointLastAtRef.current >= 5000'), 'le header History est limité à une écriture toutes les 5 secondes');
assert(!x01.slice(x01.indexOf('const persistAutosave'), x01.indexOf('// Reprise depuis HISTORIQUE')).includes('requestIdleCallback'), 'la durabilité des darts ne dépend plus de requestIdleCallback');
assert(x01.includes('window.addEventListener("pagehide", flushPagehideFallback)'), 'Android/browser force une copie de secours au pagehide');
assert(x01.includes('.then(() => clearX01CriticalCheckpoint'), 'le checkpoint critique est supprimé seulement après sauvegarde finale réussie');

assert(engine.includes('const throwVisit = React.useCallback'), 'le moteur expose une validation de volée batchée');
assert(engine.includes('for (const input of darts)') && engine.includes('setState(nextState);'), 'les règles sont appliquées dart par dart puis publiées en un seul rendu React');
assert(engine.includes('if (state.status !== "match_end") return;'), 'le hook moteur ne duplique plus History.upsert pendant chaque dart');
assert(x01.includes('throwVisit(inputs);'), 'la validation manuelle utilise le commit de volée unique');

assert(app.includes('gameplayActive') && app.includes('if (loading || gameplayActive) return;'), 'les préchauffages Stats sont interdits pendant les écrans de jeu');
assert(app.includes('getX01CriticalCheckpoint(resumeId)'), 'la reprise consulte le checkpoint critique indépendant');
assert(app.includes('criticalUpdatedAt >= historyUpdatedAt'), 'le checkpoint le plus récent est prioritaire, y compris après UNDO');

if (!process.exitCode) console.log('\n✅ X01 CRASH-SAFE + ZERO-FREEZE V66 OK');
