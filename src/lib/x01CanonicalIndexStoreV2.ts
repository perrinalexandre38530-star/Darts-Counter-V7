/**
 * V121 / X01 index phase B.
 * A read-only, separately versioned projection of canonical History V4.
 * Never edits match IDs, match payloads or the historical participant list.
 * The rendering path reads this small snapshot and never opens History/IndexedDB.
 */
import { historyV4DbName, openHistoryV4Db, ensureHistoryV4Backfill,
  HISTORY_V4_HEADERS, HISTORY_V4_INDEX, HISTORY_V4_TOMBSTONES } from './historyV4';
import { buildCanonicalX01IndexFromNormalizedMatchesV2, type CanonicalX01IndexV2 } from './x01CanonicalIndexV2';
import { normalizeX01HistoryRecord, type NormalizedX01Match } from './normalizeX01HistoryRecord';
import type { X01IdentityResolverOptions } from './x01IdentityResolver';

const INDEX_VERSION = 3;
// Approved profile aliases from the historical Ninja identity audit.
// Never rewrite match participants, compact payloads, or score keys.
// Runtime `usr_...` IDs are deliberately excluded: they require match-local links.
const CONFIRMED_LEGACY_PROFILE_ALIASES: Record<string, string> = {
  'b3517e84-41a1-4eb1-8f20-3e40e3875d38': '1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f',
  'bbedd4b7-e181-4b8e-a794-c948a18e8404': '1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f',
};
const PAGE_SIZE = 24;
const PREFIX = 'dc-x01-canonical-index-v2:';
const ALIAS_PREFIX = 'dc-x01-validated-aliases-v1:';
const key = () => PREFIX + historyV4DbName();
const aliasKey = () => ALIAS_PREFIX + historyV4DbName();

export type X01StoredIndexV2 = {
  schemaVersion: 3;
  accountScope: string;
  source: 'HistoryV4';
  historySignature: string;
  index: CanonicalX01IndexV2;
};

const sleepForPaint = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function getRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('History V4 read failed'));
  });
}

/** Get a small range per transaction to prevent long uninterrupted main-thread stalls. */
async function readCanonicalHeadersInPages(): Promise<{ rows: any[]; signature: string }> {
  await ensureHistoryV4Backfill();
  const db = await openHistoryV4Db();
  const all: any[] = [];
  const signatureParts: string[] = [];
  let after: IDBValidKey | undefined;
  while (true) {
    const tx = db.transaction([HISTORY_V4_HEADERS, HISTORY_V4_INDEX, HISTORY_V4_TOMBSTONES], 'readonly');
    const store = tx.objectStore(HISTORY_V4_HEADERS);
    const range = after === undefined ? undefined : IDBKeyRange.lowerBound(after, true);
    const request = store.getAll(range, PAGE_SIZE);
    const page = (await getRequest(request)) as any[];
    if (!page.length) break;
    // IMPORTANT IndexedDB: after awaiting getAll(), the original readonly
    // transaction may already be committed. Queue all status reads in a NEW
    // transaction, synchronously before the next await. Otherwise builds can
    // randomly fail with TransactionInactiveError and the UI sees 0 matches.
    const statusTx = db.transaction([HISTORY_V4_INDEX, HISTORY_V4_TOMBSTONES], 'readonly');
    const indexStore = statusTx.objectStore(HISTORY_V4_INDEX);
    const tombStore = statusTx.objectStore(HISTORY_V4_TOMBSTONES);
    const statuses = await Promise.all(page.map((row) => {
      const id = String(row?.id || '');
      if (!id) return Promise.resolve({ row, deleted: true });
      const indexRequest = getRequest(indexStore.get(id));
      const tombRequest = getRequest(tombStore.get(id));
      return Promise.all([indexRequest, tombRequest]).then(([index, tombstone]) => ({
        row, deleted: !!(index as any)?.deleted || !!tombstone,
      }));
    }));
    for (const { row, deleted } of statuses) {
      const id = String(row?.id || '');
      // Signature also covers inactive records, so restore/remove invalidates the projection.
      signatureParts.push(`${id}:${String(row?.updatedAt || '')}:${deleted ? 1 : 0}`);
      if (!deleted) all.push(row);
    }
    after = page[page.length - 1]?.id;
    if (page.length < PAGE_SIZE) break;
    await sleepForPaint();
  }
  // Use stable, deterministic metadata; index is an entirely derived cache.
  return { rows: all, signature: JSON.stringify(signatureParts) };
}

function validatedAliases(): Record<string, string> {
  try {
    const json = localStorage.getItem(aliasKey());
    const parsed = json ? JSON.parse(json) : null;
    if (!parsed || parsed.version !== 1 || !parsed.validated || !parsed.map || typeof parsed.map !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed.map).filter(([k,v]) => !!k && typeof v === 'string' && !!v));
  } catch { return {}; }
}

/** Only invoke with explicitly validated mappings; names are never identity keys. */
export function setValidatedX01IdentityAliases(aliasMap: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  const clean: Record<string, string> = {};
  for (const [from, to] of Object.entries(aliasMap || {})) {
    if (from && typeof to === 'string' && to && from !== to) clean[from] = to;
  }
  localStorage.setItem(aliasKey(), JSON.stringify({ version: 1, validated: true, map: clean }));
  scheduleCanonicalX01IndexRebuildV2('validated-aliases-updated');
}

let inMemory: X01StoredIndexV2 | null = null;
let inFlight: Promise<X01StoredIndexV2> | null = null;
let scheduled: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

export function readCanonicalX01IndexV2(): X01StoredIndexV2 | null {
  if (typeof localStorage === 'undefined') return null;
  const scope = historyV4DbName();
  if (inMemory?.accountScope === scope) return inMemory;
  try {
    const raw = localStorage.getItem(key());
    if (!raw) return null;
    const result = JSON.parse(raw) as X01StoredIndexV2;
    if (result?.schemaVersion !== INDEX_VERSION || result?.accountScope !== scope || !Array.isArray(result?.index?.matches)) return null;
    inMemory = result;
    return result;
  } catch { return null; }
}

export function invalidateCanonicalX01IndexV2(): void {
  generation += 1;
  inMemory = null;
  try { localStorage.removeItem(key()); } catch {}
}

/** Explicit rebuild. Never call from a React render or ProfileStarRing. */
export async function rebuildCanonicalX01IndexV2(options: X01IdentityResolverOptions = {}): Promise<X01StoredIndexV2> {
  if (inFlight) return inFlight;
  const scope = historyV4DbName();
  const startedGeneration = generation;
  inFlight = (async () => {
    const { rows, signature } = await readCanonicalHeadersInPages();
    const resolverOptions = { ...options, aliasMap: { ...CONFIRMED_LEGACY_PROFILE_ALIASES, ...validatedAliases(), ...(options.aliasMap || {}) } };
    const matches: NormalizedX01Match[] = [];
    // A whole-history normalization was measured at ~2s on the reference 107
    // match backup. Never make the browser execute all of it in one task.
    for (let i = 0; i < rows.length; i++) {
      if (historyV4DbName() !== scope || generation !== startedGeneration) {
        throw new Error('X01 index rebuild superseded by account switch or history update');
      }
      const match = normalizeX01HistoryRecord(rows[i], resolverOptions);
      if (match) matches.push(match);
      await sleepForPaint();
    }
    const index = buildCanonicalX01IndexFromNormalizedMatchesV2(matches, rows.length);
    if (historyV4DbName() !== scope || generation !== startedGeneration) {
      throw new Error('X01 index rebuild superseded by account switch or history update');
    }
    const result: X01StoredIndexV2 = {
      schemaVersion: 3, accountScope: scope, source: 'HistoryV4',
      historySignature: signature, index,
    };
    // Single atomic cache publication after the complete index is ready.
    // Storage quota is not allowed to break import/restore.
    try { localStorage.setItem(key(), JSON.stringify(result)); } catch {}
    inMemory = result;
    try { window.dispatchEvent(new CustomEvent('dc-x01-canonical-index-ready', { detail: { x01MatchCount: index.x01MatchCount } })); } catch {}
    try { window.dispatchEvent(new CustomEvent('dc-x01-canonical-updated', { detail: { updatedAt: index.builtAt } })); } catch {}
    return result;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

/** Invalidate immediately; run only once the complete restore has committed. */
export function scheduleCanonicalX01IndexRebuildV2(reason = 'history-restored'): void {
  invalidateCanonicalX01IndexV2();
  if (scheduled !== null) clearTimeout(scheduled);
  if (typeof window === 'undefined') return;
  scheduled = setTimeout(() => {
    scheduled = null;
    const start = () => { void rebuildCanonicalX01IndexV2().catch((error) => {
      if (String(error?.message || '').includes('superseded')) {
        scheduleCanonicalX01IndexRebuildV2('history-updated-during-rebuild');
        return;
      }
      console.warn('[X01 canonical index] rebuild postponed:', reason, error);
    }); };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 3000 });
    else setTimeout(start, 0);
  }, 350);
}
